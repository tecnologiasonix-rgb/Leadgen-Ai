export interface EmailLog {
  email: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

export const emailService = {
  async sendEmail(data: { to: string; subject: string; html: string; leads?: any[]; userId?: string; smtpSettings?: any }) {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Error al enviar email');
    }

    return response.json();
  }
};

export const EMAIL_TEMPLATES = [
  {
    id: 'no-web-expert',
    name: '💎 Email 1: Toma de Contacto',
    subject: 'Tu negocio merece más — Tecnologías Onix',
    description: 'Primer email de contacto para nuevos leads.',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu negocio merece más — Tecnologías Onix</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { background-color: #f4f4f5; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto; width: 100%; border-spacing: 0; }
    .header { padding: 30px; border-bottom: 1px solid #f0f0f0; text-align: left; }
    .hero { padding: 40px 30px 20px 30px; text-align: left; }
    .hero-title { margin: 0 0 20px 0; font-size: 32px; line-height: 1.2; color: #111827; }
    .body-content { padding: 20px 30px; text-align: left; }
    .cta-area { padding: 10px 30px 40px 30px; text-align: center; }
    .footer { padding: 30px; background-color: #0f172a; color: #94a3b8; }
    
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 0 !important; }
      .card { border-radius: 0 !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
      .header { padding: 20px !important; }
      .hero { padding: 30px 20px 15px 20px !important; }
      .hero-title { font-size: 26px !important; }
      .body-content { padding: 15px 20px !important; }
      .cta-area { padding: 10px 20px 30px 20px !important; }
      .footer { padding: 25px 20px !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="wrapper">
    <tr>
      <td align="center" style="padding: 0;">
        <table align="center" width="100%" class="card" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td class="header">
               <img src="https://raw.githubusercontent.com/Onixmanager/TecnologiasOnix/refs/heads/main/Tecnologiaslogomini.webp" alt="Tecnologías Onix" width="40" style="display: block; margin-bottom: 10px;">
               <h3 style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">Tecnologías Onix</h3>
            </td>
          </tr>
          <tr>
            <td class="hero">
              <span style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600; border-radius: 100px; margin-bottom: 16px;">Toma de Contacto</span>
              <h1 class="hero-title">{{business}} merece trabajar menos y ganar más.</h1>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hola <strong>{{name}}</strong>, somos <strong>Tecnologías Onix</strong>. Modernizamos negocios de hostelería con sistemas digitales que aumentan tu facturación y reducen la carga de trabajo de tu equipo.
              </p>
              <div style="margin-top: 20px; padding: 15px; background-color: #fefce8; border-left: 4px solid #facc15; font-size: 14px; color: #854d0e; font-style: italic;">
                <strong>Nota personalizada de nuestro Agente IA:</strong><br>
                {{notes}}
              </div>
            </td>
          </tr>
          <tr>
            <td class="body-content">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">📱 Camarero Digital</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Menús interactivos y pedidos inteligentes desde el móvil. Cero esperas para tus clientes, rotación de mesas el doble de rápida.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">⏳ Ahorro de Tiempo</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Tu personal se centra en lo más importante (la excelente atención) en lugar de tomar notas a mano de un lado al otro.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">📈 Crecimiento Real</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Tus clientes gastan más al ver los platos recomendados en HD. El ticket medio de compra sube hasta un 20%.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="cta-area">
              <a href="https://wa.me/34643229507?text=Hola,%20quisiera%20más%20info%20sobre%20el%20Camarero%20Digital." style="display: inline-block; padding: 14px 30px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; text-align: center;">Ver Demo de Camarero Digital</a>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">¿Dudas? Envíame un mensaje por WhatsApp y te asesoro gratis.</p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 14px; line-height: 1.5; text-align: left;">
                    <strong style="color: #ffffff;">Tecnologías Onix</strong><br>
                    <a href="https://wa.me/34643229507" style="color: #60a5fa; text-decoration: none;">+34 643 229 507</a><br>
                    <a href="https://tecnologiasonix.com" style="color: #60a5fa; text-decoration: none;">tecnologiasonix.com</a>
                  </td>
                  <td align="right" valign="top" style="font-size: 12px; line-height: 1.5; text-align: right;">
                    &copy; 2026<br>Todos los derechos reservados.<br>
                    <small>Este email es informativo.</small>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  },
  {
    id: 'promo-web-maps',
    name: '🚀 Email 2: Promoción Web + Maps',
    subject: 'Tu negocio merece ser visto — Tecnologías Onix',
    description: 'Email promocional enfocado en Web y Google Maps.',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu negocio merece ser visto — Tecnologías Onix</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { background-color: #f4f4f5; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto; width: 100%; border-spacing: 0; }
    .header { padding: 30px; border-bottom: 1px solid #f0f0f0; text-align: left; }
    .hero { padding: 40px 30px 20px 30px; text-align: left; }
    .hero-title { margin: 0 0 20px 0; font-size: 32px; line-height: 1.2; color: #111827; }
    .body-content { padding: 20px 30px; text-align: left; }
    .cta-area { padding: 10px 30px 40px 30px; text-align: center; }
    .footer { padding: 30px; background-color: #0f172a; color: #94a3b8; }
    
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 0 !important; }
      .card { border-radius: 0 !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; }
      .header { padding: 20px !important; }
      .hero { padding: 30px 20px 15px 20px !important; }
      .hero-title { font-size: 26px !important; }
      .body-content { padding: 15px 20px !important; }
      .cta-area { padding: 10px 20px 30px 20px !important; }
      .footer { padding: 25px 20px !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="wrapper">
    <tr>
      <td align="center" style="padding: 0;">
        <table align="center" width="100%" class="card" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td class="header">
               <img src="https://raw.githubusercontent.com/Onixmanager/TecnologiasOnix/refs/heads/main/Tecnologiaslogomini.webp" alt="Tecnologías Onix" width="40" style="display: block; margin-bottom: 10px;">
               <h3 style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">Tecnologías Onix</h3>
            </td>
          </tr>
          <tr>
            <td class="hero">
              <span style="display: inline-block; padding: 4px 10px; background-color: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600; border-radius: 100px; margin-bottom: 16px;">🚀 WEB + MAPS</span>
              <h1 class="hero-title">{{business}} merece estar en Google con una web que convierte.</h1>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Hola <strong>{{name}}</strong>, creamos páginas web profesionales para hostelería y optimizamos tu ficha de Google Maps para que la gente te encuentre de inmediato y dejen de irse a tu competencia.
              </p>
              <div style="margin-top: 20px; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #22c55e; font-size: 14px; color: #166534; font-style: italic;">
                <strong>Observación sobre tu presencia digital:</strong><br>
                {{notes}}
              </div>
            </td>
          </tr>
          <tr>
            <td class="body-content">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">📍 Posicionamiento Local</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Domina tu ciudad. Configuramos tu ficha para ser la primera opción al buscar "restaurantes cerca" o el nombre de tu municipio en Maps.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">💻 Web Persuasiva</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Tu carta, horarios y reservas centralizados en un diseño sumamente atractivo y profesional que funciona perfectamente en móviles.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: left;">
                    <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #111827;">⚡ SEO & Rendimiento</h4>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #4b5563;">Carga ultrarrápida (A+) y estructura web optimizada para cumplir con los estándares técnicos y subir tu reputación frente a Google.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="cta-area">
              <a href="https://wa.me/34643229507?text=Hola,%20me%20interesa%20crear%20una%20web%20y%20posicionar%20en%20Maps." style="display: inline-block; padding: 14px 30px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; text-align: center;">Quiero mi web profesional</a>
              <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">Contacta conmigo y te asesoro de forma gratuita hoy mismo.</p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 14px; line-height: 1.5; text-align: left;">
                    <strong style="color: #ffffff;">Tecnologías Onix</strong><br>
                    <a href="https://wa.me/34643229507" style="color: #60a5fa; text-decoration: none;">+34 643 229 507</a><br>
                    <a href="https://tecnologiasonix.com" style="color: #60a5fa; text-decoration: none;">tecnologiasonix.com</a>
                  </td>
                  <td align="right" valign="top" style="font-size: 12px; line-height: 1.5; text-align: right;">
                    &copy; 2026<br>Todos los derechos reservados.<br>
                    <small>Este email es informativo.</small>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
  }
];