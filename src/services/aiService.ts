import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey });

export class AIService {
  static async generateLeads(prompt: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "";
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        return JSON.parse(cleanText);
      } catch (e) {
        console.error("Error parsing Gemini JSON:", e, "Raw text:", text);
        throw new Error("La IA no devolvió un formato válido.");
      }
    } catch (error: any) {
      console.error("Error in generateLeads:", error);
      throw new Error(error.message || "Error al consultar la IA");
    }
  }

  static async evaluateLead(prompt: string) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text = response.text || "";
      return text.replace(/```json/g, "").replace(/```/g, "").trim();
    } catch (error: any) {
      console.error("Error in evaluateLead:", error);
      throw new Error(error.message || "Error al evaluar el lead");
    }
  }

  static async generateEmail(promptDetails: string, currentHtml?: string) {
    const onixRules = `Somos "Tecnologías Onix". Nuestro sitio web es tecnologiasonix.com.
Nos gustan los emails limpios y profesionales. El marketing debe ser poco agresivo, con un trato cercano. Muestra de forma clara los beneficios para el cliente en relación al producto o promoción. Sé conciso y al grano.`;

    const systemPrompt = currentHtml ? `Eres un experto en marketing y diseño de correos electrónicos. Tu tarea es modificar la siguiente plantilla HTML basándote en la orden del usuario.
PLANTILLA ACTUAL:
\`\`\`html
${currentHtml}
\`\`\`

Debes devolver EXCLUSIVAMENTE el nuevo código HTML completo, sin markdown, sin introducciones ni conclusiones. Mantén los estilos inline y que sea responsivo. Usa variables como {{name}} y {{business}} cuando hables con el cliente.
${onixRules}
ORDEN: ${promptDetails}` : `Eres un experto en marketing y diseño de correos electrónicos. Crea una nueva plantilla HTML para un correo en frío para vender tecnología a negocios de hostelería, basándote en lo que el usuario pida. 
La estructura del HTML debe ser tabular, compatible con email, moderna, minimalista parecida a las actuales, responsiva y que ocupe de manera óptima la pantalla sin márgenes artificiales. Usa variables {{name}} y {{business}}.
${onixRules}
No uses markdown para envolver tu respuesta. Devuelve SOLO código HTML.
ORDEN: ${promptDetails}`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      });
      const text = response.text || "";
      return text.replace(/```html/g, "").replace(/```/g, "").trim();
    } catch (error: any) {
      console.error("Error in generateEmail:", error);
      throw new Error(error.message || "Error al generar el email");
    }
  }
}
