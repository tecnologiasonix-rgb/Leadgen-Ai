import { GoogleGenAI } from '@google/genai';
import { Lead } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIEvalProfile {
  id: string;
  name: string;
  targetDescription: string;
  instructions: string;
}

export const AI_EVAL_PROFILES: AIEvalProfile[] = [
  {
    id: 'restaurantes',
    name: 'Bares y Restaurantes (Default)',
    targetDescription: 'restaurante o local de hostelería',
    instructions: '1. ¿Tiene terraza?\n2. ¿Qué tamaño o capacidad aproximada tiene (pequeño/mediano/grande)?\n3. ¿Cómo es el sentimiento general de las reseñas (buenas, tiene quejas por servicio)?\n4. ¿Algún punto fuerte o débil a la hora de venderles tecnología/sofware?'
  },
  {
    id: 'clinicas',
    name: 'Clínicas y Centros Médicos',
    targetDescription: 'clínica dental o centro médico',
    instructions: '1. ¿Tienen cita previa online en su web?\n2. ¿Qué tal están las reseñas sobre la atención al paciente?\n3. ¿Especialidad destacada (si la hay)?\n4. ¿Punto fuerte/débil para venderles un software de gestión de citas?'
  },
  {
    id: 'gimnasios',
    name: 'Gimnasios y Centros Deportivos',
    targetDescription: 'gimnasio o centro deportivo',
    instructions: '1. ¿Tienen clases colectivas?\n2. ¿Ofrecen entrenamiento personal o fisioterapia?\n3. ¿Disponen de app propia para los clientes?\n4. ¿Punto fuerte/débil para venderles tecnología o CRM?'
  },
  {
    id: 'inmobiliarias',
    name: 'Inmobiliarias',
    targetDescription: 'agencia inmobiliaria',
    instructions: '1. ¿Venden y alquilan, o solo un tipo?\n2. ¿Destacan por algo en especial (lujo, alquileres turísticos, exclusivas)?\n3. ¿Tienen buen posicionamiento web y reseñas?\n4. ¿Punto fuerte/débil para venderles servicios de captación de leads o marketing?'
  },
  {
    id: 'ecommerce',
    name: 'Tiendas Online / Retail',
    targetDescription: 'tienda online o comercio',
    instructions: '1. ¿Qué tipo de productos venden principalmente?\n2. ¿Ofrecen envíos gratis o promociones destacadas?\n3. ¿Cómo es el sentimiento en reseñas (envíos rápidos, quejas...)?\n4. ¿Punto fuerte/débil para ofrecerles mejoras webs, marketing o logística?'
  }
];

export class AIEvaluator {
  static async evaluateLead(lead: Lead, profile?: AIEvalProfile): Promise<void> {
    if (lead.aiEvaluated) {
      console.warn("Lead already evaluated by AI");
      return;
    }

    try {
      // Set to loading or specific status
      if (lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), { notes: 'Evaluando con IA...' });
      }

      const evalTarget = profile?.targetDescription || 'restaurante o local de hostelería';
      const evalInstructions = profile?.instructions || '1. ¿Tiene terraza?\n2. ¿Qué tamaño o capacidad aproximada tiene (pequeño/mediano/grande)?\n3. ¿Cómo es el sentimiento general de las reseñas (buenas, tiene quejas por servicio)?\n4. ¿Algún punto fuerte o débil a la hora de venderles tecnología/sofware?';

      const prompt = `
Analiza este negocio (${evalTarget}) de España.
Nombre: ${lead.name}
Dirección: ${lead.address}
Código Postal: ${lead.zipCode || 'No especificado'}
Web: ${lead.website || 'No especificada'}

Por favor, busca información sobre este negocio y genera una nota corta, concisa y directa (máx 3 líneas) sobre:
${evalInstructions}

Dame SOLO el texto de la nota resultante sin saludos ni introducciones, formato texto plano.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        // @ts-ignore - The types in this version of the SDK might not include tools yet
        tools: [{ googleSearch: {} }]
      });

      const textResult = response.text?.trim() || 'No se pudo obtener información.';

      if (lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), { 
          notes: textResult,
          status: 'contacted', // Changing status optionally to show action was taken
          aiEvaluated: true
        });
      }

    } catch (error) {
      console.error('Error in AI Evaluation:', error);
      if (lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), { notes: 'Error al evaluar con IA.' });
      }
    }
  }

  static async generateEmailTemplate(promptDetails: string, currentHtml?: string): Promise<string> {
    const onixRules = `Somos "Tecnologías Onix". Nuestro sitio web es tecnologiasonix.com.
Nos gustan los emails limpios y profesionales. El marketing debe ser poco agresivo, con un trato cercano. Muestra de forma clara los beneficios para el cliente en relación al producto o promoción. Sé conciso y al grano.`;

    const systemPrompt = currentHtml ? `Eres un experto en marketing y diseño de correos electrónicos. Tu tarea es modificar la siguiente plantilla HTML basándote en la orden del usuario.
PLANTILLA ACTUAL:
\`\`\`html
${currentHtml}
\`\`\`

Debes devolver EXCLUSIVAMENTE el nuevo código HTML completo, sin markdown, sin introducciones ni conclusiones. Mantén los estilos inline y que sea responsivo. Usa variables como {{name}} y {{business}} cuando hables con el cliente. Si te pide que la plantilla ocupe todo el ancho de la pantalla y no tenga espacios, ajusta el body, table y padding (ej. .wrapper { padding: 0 }, max-width: 100%, etc.).
${onixRules}
ORDEN: ${promptDetails}` : `Eres un experto en marketing y diseño de correos electrónicos. Crea una nueva plantilla HTML para un correo en frío para vender tecnología a negocios de hostelería, basándote en lo que el usuario pida. 
La estructura del HTML debe ser tabular, compatible con email, moderna, minimalista parecida a las actuales, responsiva y que ocupe de manera óptima la pantalla sin márgenes artificiales que lo hagan ver estrecho en el móvil. Usa variables {{name}} y {{business}}.
${onixRules}
No uses markdown para envolver tu respuesta. Devuelve SOLO código HTML.
ORDEN: ${promptDetails}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: systemPrompt
      });
      
      let html = response.text || '';
      // Limpiar posibles bloques de markdown si el modelo los añade a pesar de la orden
      if (html.startsWith('```html')) {
        html = html.replace(/^```html\n/, '').replace(/\n```$/, '');
      }
      return html.trim();
    } catch (error) {
      console.error('Error generating email template:', error);
      throw error;
    }
  }
}
