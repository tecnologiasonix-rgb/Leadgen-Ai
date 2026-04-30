import { GoogleGenAI, Type } from "@google/genai";
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { Lead } from "../types";
import { db, auth } from "../lib/firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(`Error en Firestore (${operationType} en ${path}): ${errInfo.error}`);
}

export class LeadService {
  private ai: GoogleGenAI;

  constructor() {
    // En el navegador, Vite reemplaza process.env.GEMINI_API_KEY si está definido en el build
    const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : (import.meta.env.VITE_GEMINI_API_KEY || '');
    
    // No lanzamos error aquí para evitar que la app entera se quede en blanco (white screen)
    // El error se manejará cuando se intente usar el servicio.
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'missing_key' });
  }

  private ensureApiKey() {
    const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : (import.meta.env.VITE_GEMINI_API_KEY || '');
    if (!apiKey || apiKey === 'missing_key') {
      throw new Error("API Key de Gemini no configurada. Por favor, añádela a las variables de entorno de tu despliegue.");
    }
  }

  async saveToFirestore(lead: Lead, userId: string): Promise<string> {
    const path = "leads";
    try {
      const docRef = await addDoc(collection(db, path), {
        ...lead,
        userId,
        createdAt: serverTimestamp(),
        status: lead.status || 'new',
        aiEvaluated: false
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return ""; // Never reached
    }
  }

  async getUserLeads(userId: string): Promise<Lead[]> {
    const path = "leads";
    try {
      const q = query(
        collection(db, path),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lead[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return []; // Never reached
    }
  }

  async deleteLead(leadId: string): Promise<void> {
    const path = `leads/${leadId}`;
    try {
      console.log('Attempting to delete lead:', leadId);
      await deleteDoc(doc(db, "leads", leadId));
      console.log('Successfully deleted lead:', leadId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async deleteAllLeads(userId: string): Promise<void> {
    if (!userId) {
      throw new Error("userId is required for deleteAllLeads");
    }
    const path = "leads";
    try {
      console.log('Attempting to fetch all leads for deletion for user:', userId);
      const q = query(collection(db, path), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('No leads found for deletion');
        return;
      }

      console.log(`Found ${querySnapshot.size} leads to delete. Starting batch...`);
      const batch = writeBatch(db);
      querySnapshot.forEach((document) => {
        batch.delete(doc(db, "leads", document.id));
      });
      
      await batch.commit();
      console.log('Successfully committed batch deletion');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async searchLeads(zipCodes: string[], businessType: string): Promise<Lead[]> {
    const allLeads: Lead[] = [];

    // Procesamos cada código postal para asegurar máxima calidad por zona
    try {
      this.ensureApiKey();
    } catch (e) {
      alert((e as Error).message);
      return [];
    }

    for (const zip of zipCodes) {
      const prompt = `Actúa como un experto en Inteligencia de Ventas y OSINT. Tu misión es extraer una lista EXHAUSTIVA (al menos 40 si existen) de leads del tipo "${businessType}" en el código postal ${zip.trim()} de España.
      
      INSTRUCCIONES CRÍTICAS DE BÚSQUEDA:
      1. PRIORIDAD MÁXIMA: EL EMAIL. Tu objetivo principal es encontrar establecimientos que tengan correo electrónico de contacto. Realiza búsquedas insistentes para localizarlo.
      2. INCLUYE NEGOCIOS SIN WEB: No descartes establecimientos por no tener sitio web. Sigue incluyéndolos (son valiosos), pero prioriza la captura del email sobre cualquier otro dato.
      3. CALIDAD DE DATOS: Nombre, dirección y teléfono son obligatorios. Si NO tiene sitio web o email, deja el campo EXACTAMENTE como una cadena vacía "". No uses "N/A" ni otros textos.
      4. CUMPLIMIENTO: Asegúrate de que todos los establecimientos pertenezcan al CP ${zip.trim()}.
      
      Responde ÚNICAMENTE con el JSON array solicitado.`;

      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  email: { type: Type.STRING },
                  website: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ["name", "address"]
              }
            }
          }
        });

        const text = response.text;
        if (text) {
          const leads = JSON.parse(text);
          allLeads.push(...leads);
        }
      } catch (error) {
        console.error(`Error en zona ${zip}:`, error);
      }
      
      // ANTIBLOQUEO: Esperar 8 segundos entre cada código postal para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
    
    // Eliminar duplicados por nombre y dirección
    const uniqueLeads = Array.from(new Map(allLeads.map(item => [`${item.name}-${item.address}`, item])).values());
    return uniqueLeads;
  }
}
