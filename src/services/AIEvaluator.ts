import { Lead } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
      if (lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), { notes: 'Evaluando con IA...' });
      }
      const evalTarget = profile?.targetDescription || 'restaurante o local de hostelería';
      const evalInstructions = profile?.instructions || '1. ¿Tiene terraza?\n2. ¿Qué tamaño o capacidad aproximada tiene?\n3. ¿Cómo es el sentimiento general de las reseñas?\n4. ¿Algún punto fuerte o débil a la hora de venderles tecnología?';
      const prompt = `Analiza este negocio (${evalTarget}) de España.
Nombre: ${lead.name}
Dirección: ${lead.address}
Código Postal: ${lead.zipCode || 'No especificado'}
Web: ${lead.website || 'No especificada'}

Por favor, busca información sobre este negocio y genera una nota corta, concisa y directa (máx 3 líneas) sobre:
${evalInstructions}

Dame SOLO el texto de la nota resultante sin saludos ni introducciones, formato texto plano.`;
      
      const response = await fetch('/api/evaluate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      const textResult = data.textResult || 'No se pudo obtener información.';

      if (lead.id) {
        await updateDoc(doc(db, 'leads', lead.id), {
          notes: textResult,
          status: 'investigated',
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
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptDetails, currentHtml })
      });
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      return data.html || '';
    } catch (error) {
      console.error('Error generating email template:', error);
      throw error;
    }
  }
}
