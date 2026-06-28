import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Stripe from "stripe";
import admin from "firebase-admin";

dotenv.config();

// Inicializar Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("[Firebase Admin] Inicializado correctamente.");
    }
  } else {
    console.warn("[Firebase Admin] No se ha configurado FIREBASE_SERVICE_ACCOUNT. El Webhook de Stripe no podrá actualizar la base de datos.");
  }
} catch (error) {
  console.error("[Firebase Admin] Error inicializando Firebase Admin:", error);
}

// Inicializar Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" as any }) 
  : null;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 3000;

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      env: {
        GEMINI_API_KEY_CONFIGURED: !!process.env.GEMINI_API_KEY,
        STRIPE_SECRET_CONFIGURED: !!process.env.STRIPE_SECRET_KEY,
        FIREBASE_ADMIN_CONFIGURED: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        SMTP_CONFIGURED: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
      }
    });
  });

  // Ruta Webhook de Stripe (Debe usar express.raw ANTES de express.json para que funcione la verificación de la firma)
  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !endpointSecret || !admin.apps.length) {
      return res.status(500).send("Webhook configuration missing.");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
      console.error("[Stripe Webhook] Error verificando la firma:", (err as Error).message);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    // Manejar el evento
    try {
      const db = admin.firestore();
      
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.client_reference_id;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;
          
          if (userId) {
            console.log(`[Stripe Webhook] Actualizando plan para el usuario: ${userId}`);
            
            // Determinar el plan basado en el price ID, metadatos, o link (para este ejemplo es genérico)
            // Asumimos un rol 'pro' por defecto si compran un checkout básico, tú puedes mapearlo mejor:
            let plan = 'pro'; 
            let limit = 5000;

            await db.collection('users').doc(userId).set({
              plan: plan,
              stripeCustomerId: customerId,
              subscriptionId: subscriptionId,
              subscriptionStatus: 'active',
              leadsLimit: limit,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          
          // Buscar el usuario con este customerId
          const usersSnapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();
          
          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            await userDoc.ref.update({
              subscriptionStatus: subscription.status,
              // Si se cancela/elimina, pasamos a plan enterprise con límites altos
              plan: subscription.status === 'active' ? userDoc.data().plan : 'enterprise',
              leadsLimit: subscription.status === 'active' ? userDoc.data().leadsLimit : 999999,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[Stripe Webhook] Suscripción actualizada para ${userDoc.id}: ${subscription.status}`);
          }
          break;
        }
        default:
          console.log(`[Stripe Webhook] Evento no manejado: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (err) {
      console.error("[Stripe Webhook] Error manejando el evento:", err);
      res.status(500).send("Webhook handler failed.");
    }
  });

  // Importante: parsear JSON para el resto de rutas DESPUÉS del webhook de Stripe
  app.use(express.json());

  // Configuración SMTP Dinámica
  const smtpPort = parseInt(process.env.EMAIL_PORT || "465");
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.zoho.eu",
    port: smtpPort,
    secure: smtpPort === 465, // SSL para 465, STARTTLS para otros
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Añadimos esto para asegurar compatibilidad con servidores que requieren TLS
    tls: {
      rejectUnauthorized: false
    }
  });

  app.post("/api/generate-leads", async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key de Deepseek no configurada en el servidor." });
    }
    try {
      const { prompt } = req.body;
      const dsResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });
      if (!dsResponse.ok) throw new Error("Deepseek API failed: " + await dsResponse.text());
      const dsData = await dsResponse.json();
      let text = dsData.choices[0].message.content || '';
      
      // Limpiar markdown si la IA lo envuelve
      if (text.startsWith('```json')) {
        text = text.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("[Deepseek API] Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/evaluate-lead", async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key de Deepseek no configurada" });
    }
    try {
      const { prompt } = req.body;
      const dsResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      });
      if (!dsResponse.ok) throw new Error("Deepseek API failed");
      const dsData = await dsResponse.json();
      const textResult = dsData.choices[0].message.content || 'No se pudo obtener información.';
      res.json({ textResult });
    } catch (error) {
      console.error("[Deepseek Eval] Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/generate-email", async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "API Key de Deepseek no configurada" });
    }
    try {
      const { promptDetails, currentHtml } = req.body;
      const onixRules = `Somos "Tecnologías Onix". Nuestro sitio web es tecnologiasonix.com.\nNos gustan los emails limpios y profesionales. El marketing debe ser poco agresivo, con un trato cercano. Muestra de forma clara los beneficios para el cliente en relación al producto o promoción. Sé conciso y al grano.`;
      const systemPrompt = currentHtml
        ? `Eres un experto en marketing y diseño de correos electrónicos. Tu tarea es modificar la siguiente plantilla HTML basándote en la orden del usuario.\nPLANTILLA ACTUAL:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nDevuelve EXCLUSIVAMENTE el nuevo HTML completo, sin markdown. Mantén estilos inline y responsivo. Usa variables {{name}} y {{business}}.\n${onixRules}\nORDEN: ${promptDetails}`
        : `Eres un experto en marketing y diseño de correos electrónicos. Crea una plantilla HTML para email en frío para vender tecnología a negocios de hostelería. Estructura tabular, compatible con email, moderna, responsiva. Usa variables {{name}} y {{business}}.\n${onixRules}\nDevuelve SOLO código HTML.\nORDEN: ${promptDetails}`;
      
      const dsResponse = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: systemPrompt }],
          temperature: 0.2
        })
      });
      if (!dsResponse.ok) throw new Error("Deepseek API failed");
      const dsData = await dsResponse.json();
      let html = dsData.choices[0].message.content || '';
      if (html.startsWith('```html')) {
        html = html.replace(/^```html\n/, '').replace(/\n```$/, '');
      } else if (html.startsWith('```')) {
        html = html.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      res.json({ html: html.trim() });
    } catch (error) {
      console.error("[Deepseek Email] Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API para enviar emails
  // API para enviar emails — intenta SMTP primero, si falla usa Resend API
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, html, leads, userId, smtpSettings } = req.body;

    // --- Configuración SMTP ---
    let smtpHost = process.env.EMAIL_HOST || "smtp.zoho.eu";
    let smtpPort = parseInt(process.env.EMAIL_PORT || "465");
    let smtpUser = process.env.EMAIL_USER;
    let smtpPass = process.env.EMAIL_PASS;
    let smtpFromName = process.env.EMAIL_FROM_NAME || "Tecnologias Onix";

    let resendApiKey = process.env.RESEND_API_KEY;
    let resendFrom = process.env.EMAIL_FROM || "contacto@tecnologiasonix.online";

    // Leer configuración de usuario desde Firestore (una sola petición para SMTP + Resend)
    try {
      if (smtpSettings && smtpSettings.user && smtpSettings.pass) {
        smtpHost = smtpSettings.host || smtpHost;
        smtpPort = parseInt(smtpSettings.port || "465");
        smtpUser = smtpSettings.user;
        smtpPass = smtpSettings.pass;
        smtpFromName = smtpSettings.fromName || smtpFromName;
      } else if (userId && admin && admin.apps && admin.apps.length) {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data() || {};
          const userSmtpSettings = userData.smtpSettings;
          if (userSmtpSettings && userSmtpSettings.user && userSmtpSettings.pass) {
            smtpHost = userSmtpSettings.host || smtpHost;
            smtpPort = parseInt(userSmtpSettings.port || "465");
            smtpUser = userSmtpSettings.user;
            smtpPass = userSmtpSettings.pass;
            smtpFromName = userSmtpSettings.fromName || smtpFromName;
          }
          if (userData.resendApiKey && userData.resendApiKey.trim()) {
            resendApiKey = userData.resendApiKey.trim();
          }
          if (userData.resendFrom && userData.resendFrom.trim()) {
            resendFrom = userData.resendFrom.trim();
          }
        }
      }
    } catch (firestoreErr) {
      console.warn("[Email] No se pudo leer configuración de Firestore, usando variables de entorno:", (firestoreErr as Error).message);
    }

    // --- Configuración Resend API (fallback) ---

    // --- Función envío por Resend API ---
    const sendViaResendApi = async (toEmail: string, emailSubject: string, emailHtml: string) => {
      console.log(`[Resend API] Enviando a: ${toEmail}`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `${smtpFromName} <${resendFrom}>`,
          to: [toEmail],
          subject: emailSubject,
          html: emailHtml
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Resend API error: ${response.status}`);
      }
      const data = await response.json();
      console.log(`[Resend API] Enviado con éxito a: ${toEmail}`);
      return data;
    };

    // --- Función envío por SMTP ---
    const sendViaSmtp = async (toEmail: string, emailSubject: string, emailHtml: string) => {
      if (!smtpUser || !smtpPass) throw new Error("Credenciales SMTP no configuradas");
      console.log(`[SMTP] Enviando a: ${toEmail} via ${smtpHost}`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: false }
      });
      await transporter.verify();
      const info = await transporter.sendMail({
        from: `"${smtpFromName}" <${smtpUser}>`,
        to: toEmail,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`[SMTP] Enviado con éxito a: ${toEmail}`);
      return info;
    };

    // --- Función principal con fallback ---
    const sendEmail = async (toEmail: string, emailSubject: string, emailHtml: string) => {
      // Intenta SMTP primero
      if (smtpUser && smtpPass) {
        try {
          return await sendViaSmtp(toEmail, emailSubject, emailHtml);
        } catch (smtpErr) {
          console.warn(`[SMTP] Falló, intentando Resend API:`, (smtpErr as Error).message);
        }
      }
      // Fallback: Resend API
      if (resendApiKey) {
        return await sendViaResendApi(toEmail, emailSubject, emailHtml);
      }
      throw new Error("No hay método de envío disponible. Configura SMTP o RESEND_API_KEY.");
    };

    try {
      if (leads && Array.isArray(leads)) {
        console.log(`[Email] Envío masivo: ${leads.length} destinatarios`);
        const results = [];
        for (const lead of leads) {
          const personalizedHtml = html
            .replace(/\{\{name\}\}/g, lead.name || "amigo")
            .replace(/\{\{business\}\}/g, lead.name || "tu negocio")
            .replace(/\{\{notes\}\}/g, lead.notes || "");
          const personalizedSubject = subject.replace(/\{\{business\}\}/g, lead.name || "tu negocio");

          try {
            await sendEmail(lead.email, personalizedSubject, personalizedHtml);

            // Actualizar estado en Firestore (opcional, no bloquea si falla)
            if (admin.apps.length && lead.id) {
              try {
                await admin.firestore().collection('leads').doc(lead.id).update({
                  status: 'contacted',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              } catch (fsError) {
                console.warn(`[Firestore] No se pudo actualizar lead ${lead.id}:`, (fsError as Error).message);
              }
            }

            results.push({ email: lead.email, status: "sent" });
          } catch (err) {
            console.error(`[Email] Error enviando a ${lead.email}:`, (err as Error).message);
            results.push({ email: lead.email, status: "failed", error: (err as Error).message });
          }

          const randomWait = 1000 + Math.floor(Math.random() * 2000);
          await new Promise(resolve => setTimeout(resolve, randomWait));
        }
        return res.json({ success: true, results });
      } else {
        await sendEmail(to, subject, html);
        return res.json({ success: true });
      }
    } catch (error) {
      console.error("[Email] Error crítico:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TWILIO: Llamadas con IA
  // Requiere en .env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/calls/ai-call
   * Lanza una llamada desde el número Twilio al teléfono del lead.
   * Twilio ejecutará el TwiML de /api/calls/twiml cuando el lead conteste.
   */
  app.post("/api/calls/ai-call", async (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({
        error: "Twilio no configurado. Añade TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_PHONE_NUMBER al .env"
      });
    }

    const { leadId, leadName, phone, userId } = req.body;
    if (!phone) return res.status(400).json({ error: "Falta el número de teléfono" });

    // Normalizar número: si tiene 9 dígitos es España → añadir +34
    const rawPhone = String(phone).replace(/\D/g, '');
    const toNumber = rawPhone.startsWith('34') ? `+${rawPhone}` : `+34${rawPhone}`;

    // URL base del servidor (debe ser accesible por Twilio → en local usa ngrok)
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const twimlUrl = `${baseUrl}/api/calls/twiml?leadId=${encodeURIComponent(leadId)}&leadName=${encodeURIComponent(leadName || '')}&userId=${encodeURIComponent(userId || '')}`;
    const statusUrl = `${baseUrl}/api/calls/status?leadId=${encodeURIComponent(leadId)}&userId=${encodeURIComponent(userId || '')}`;

    try {
      // Llamada a la API REST de Twilio sin SDK (para no añadir dependencia)
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: toNumber,
            From: fromNumber,
            Url: twimlUrl,
            StatusCallback: statusUrl,
            StatusCallbackMethod: "POST",
            Record: "true",
            RecordingStatusCallback: `${baseUrl}/api/calls/recording?leadId=${encodeURIComponent(leadId)}&userId=${encodeURIComponent(userId || '')}`,
            RecordingStatusCallbackMethod: "POST",
          }).toString(),
        }
      );

      const twilioData = await twilioRes.json() as any;
      if (!twilioRes.ok) {
        console.error("[Twilio] Error:", twilioData);
        return res.status(twilioRes.status).json({ error: twilioData.message || "Error de Twilio" });
      }

      console.log(`[Twilio] Llamada iniciada SID: ${twilioData.sid} → ${toNumber}`);
      res.json({ callSid: twilioData.sid, status: twilioData.status });
    } catch (error) {
      console.error("[Twilio] Error lanzando llamada:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * POST /api/calls/twiml
   * Twilio ejecuta este endpoint cuando el lead contesta.
   * Devuelve TwiML con el guión del agente IA (voz sintética + gather de respuesta).
   */
  app.post("/api/calls/twiml", async (req, res) => {
    const leadName = req.query.leadName || req.body.leadName || 'cliente';
    const leadId   = req.query.leadId   || req.body.leadId;
    const userId   = req.query.userId   || req.body.userId;
    const baseUrl  = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Escapar caracteres especiales XML para evitar TwiML malformado
    const escapeXml = (str: string) =>
      String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const safeName = escapeXml(String(leadName));

    // TwiML: intro DENTRO de <Gather> para que el prospecto pueda interrumpir en cualquier momento
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="es-ES" timeout="10" speechTimeout="auto"
    action="${baseUrl}/api/calls/respond?leadId=${encodeURIComponent(String(leadId))}&amp;userId=${encodeURIComponent(String(userId))}"
    method="POST">
    <Say language="es-ES" voice="Polly.Conchita">
      Hola, ¿qué tal? Te llamo de Tecnologías Onix.
      Estaba revisando negocios locales en la zona y noté que tu empresa, ${safeName},
      tiene oportunidades de digitalización que te ayudarían a ahorrar costes o aumentar clientes.
      ¿Te importaría si en tres minutos te cuento cómo lo están logrando negocios similares?
    </Say>
  </Gather>
  <Say language="es-ES" voice="Polly.Conchita">
    No he podido escucharte. Te llamaremos en otro momento. ¡Hasta pronto!
  </Say>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  /**
   * POST /api/calls/respond
   * Twilio envía aquí la respuesta hablada del lead (SpeechResult).
   * DeepSeek genera la réplica del agente y se devuelve como TwiML.
   */
  app.post("/api/calls/respond", async (req, res) => {
    const speechResult = req.body.SpeechResult || '';
    const leadId = req.query.leadId || req.body.leadId;
    const userId = req.query.userId || req.body.userId;
    const callSid = req.body.CallSid || '';
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const deepseekKey = process.env.DEEPSEEK_API_KEY;

    console.log(`[Twilio Respond] Lead: ${leadId} | Speech: "${speechResult}"`);

    let agentReply = "Entendido. Te llamamos en otro momento para contarte más detalles. ¡Hasta pronto!";

    // Generar respuesta con DeepSeek
    if (deepseekKey && speechResult) {
      try {
        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${deepseekKey}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: `Eres un agente comercial amable de Tecnologías Onix que está hablando por teléfono con un prospecto de negocio en España. 
Responde de forma muy corta (máximo 2 frases), natural y conversacional. 
El objetivo es generar interés en una reunión o llamada de seguimiento para hablar sobre soluciones de digitalización.
No uses signos de puntuación complejos. No leas URLs. No menciones precios. Sé cercano y profesional.`
              },
              { role: "user", content: `El cliente ha dicho: "${speechResult}". ¿Qué responde el agente?` }
            ],
            temperature: 0.7,
            max_tokens: 120,
          })
        });
        if (dsRes.ok) {
          const dsData = await dsRes.json() as any;
          agentReply = dsData.choices?.[0]?.message?.content?.trim() || agentReply;
        }
      } catch (e) {
        console.error("[DeepSeek Respond] Error:", e);
      }
    }

    // Guardar fragmento de conversación en Firestore
    if (admin.apps.length && leadId && speechResult) {
      try {
        const fragment = `[Cliente]: ${speechResult}\n[Agente IA]: ${agentReply}`;
        // Buscamos el transcript in-progress y le añadimos el fragmento
        const leadRef = admin.firestore().collection('leads').doc(String(leadId));
        const leadDoc = await leadRef.get();
        if (leadDoc.exists) {
          const data = leadDoc.data() || {};
          const transcripts: any[] = data.callTranscripts || [];
          const idx = transcripts.findIndex((t: any) => t.callSid === callSid || t.status === 'in-progress');
          if (idx !== -1) {
            transcripts[idx].transcript = (transcripts[idx].transcript || '') + '\n' + fragment;
            await leadRef.update({ callTranscripts: transcripts });
          }
        }
      } catch (e) {
        console.error("[Firestore] Error guardando fragmento:", e);
      }
    }

    // Devolver TwiML con la respuesta del agente y un nuevo Gather
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-ES" voice="Polly.Conchita">${agentReply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Say>
  <Gather input="speech" language="es-ES" timeout="8" speechTimeout="auto"
    action="${baseUrl}/api/calls/respond?leadId=${encodeURIComponent(String(leadId))}&amp;userId=${encodeURIComponent(String(userId))}"
    method="POST">
    <Say language="es-ES" voice="Polly.Conchita">Puedes responder cuando quieras.</Say>
  </Gather>
  <Say language="es-ES" voice="Polly.Conchita">Muchas gracias por tu tiempo. ¡Hasta pronto!</Say>
  <Hangup/>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  });

  /**
   * POST /api/calls/status
   * Webhook de Twilio para el estado final de la llamada.
   * Actualiza el transcript en Firestore a "completed".
   */
  app.post("/api/calls/status", async (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    const leadId = req.query.leadId || req.body.leadId;

    console.log(`[Twilio Status] SID: ${CallSid} | Status: ${CallStatus} | Duration: ${CallDuration}s`);

    // Twilio dispara este webhook para CADA cambio de estado: initiated, ringing,
    // answered, in-progress, completed, busy, no-answer, failed, canceled.
    // Solo actualizamos Firestore en estados TERMINALES para no sobreescribir
    // el transcript 'in-progress' con 'failed' durante el ringing.
    const terminalStatuses = ['completed', 'busy', 'no-answer', 'failed', 'canceled'];
    if (!terminalStatuses.includes(CallStatus)) {
      return res.sendStatus(200);
    }

    if (admin.apps.length && leadId) {
      try {
        const leadRef = admin.firestore().collection('leads').doc(String(leadId));
        const leadDoc = await leadRef.get();
        if (leadDoc.exists) {
          const data = leadDoc.data() || {};
          const transcripts: any[] = data.callTranscripts || [];
          const idx = transcripts.findIndex((t: any) => t.callSid === CallSid || t.status === 'in-progress');
          if (idx !== -1) {
            transcripts[idx].status = CallStatus === 'completed' ? 'completed' : 'failed';
            transcripts[idx].endedAt = new Date().toISOString();
            transcripts[idx].durationSeconds = parseInt(CallDuration || '0');
            transcripts[idx].callSid = CallSid; // asegurar SID real si era fallback
            await leadRef.update({ callTranscripts: transcripts });
          }
        }
      } catch (e) {
        console.error("[Firestore Status] Error:", e);
      }
    }

    res.sendStatus(200);
  });

  /**
   * POST /api/calls/recording
   * Webhook de Twilio con la URL de la grabación cuando está disponible.
   * También solicita la transcripción automática de Twilio.
   */
  app.post("/api/calls/recording", async (req, res) => {
    const { CallSid, RecordingUrl, RecordingDuration, RecordingSid } = req.body;
    const leadId = req.query.leadId || req.body.leadId;

    console.log(`[Twilio Recording] SID: ${CallSid} | RecordingSid: ${RecordingSid} | URL: ${RecordingUrl}`);

    if (admin.apps.length && leadId && RecordingUrl) {
      try {
        const leadRef = admin.firestore().collection('leads').doc(String(leadId));
        const leadDoc = await leadRef.get();
        if (leadDoc.exists) {
          const data = leadDoc.data() || {};
          const transcripts: any[] = data.callTranscripts || [];
          const idx = transcripts.findIndex((t: any) => t.callSid === CallSid);
          if (idx !== -1) {
            // Guardamos la URL del proxy propio (/api/calls/audio/:sid) para evitar
            // exponer credenciales Twilio en el frontend.
            transcripts[idx].recordingUrl = `/api/calls/audio/${RecordingSid}`;
            transcripts[idx].durationSeconds = parseInt(RecordingDuration || '0');
            await leadRef.update({ callTranscripts: transcripts });
          }
        }
      } catch (e) {
        console.error("[Firestore Recording] Error:", e);
      }
    }

    res.sendStatus(200);
  });

  /**
   * GET /api/calls/audio/:recordingSid
   * Proxy autenticado para descargar grabaciones de Twilio sin exponer credenciales.
   */
  app.get("/api/calls/audio/:recordingSid", async (req, res) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return res.status(500).json({ error: "Twilio no configurado" });
    }

    const { recordingSid } = req.params;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
      const audioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}.mp3`,
        { headers: { "Authorization": `Basic ${credentials}` } }
      );
      if (!audioRes.ok) return res.status(audioRes.status).send("No disponible");
      res.set('Content-Type', 'audio/mpeg');
      res.set('Content-Disposition', `inline; filename="${recordingSid}.mp3"`);
      const buffer = await audioRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (e) {
      console.error("[Audio Proxy] Error:", e);
      res.status(500).send("Error al obtener grabación");
    }
  });

  // Configuración de Vite para desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de Campañas corriendo en http://localhost:${PORT}`);
  });
}

startServer();
