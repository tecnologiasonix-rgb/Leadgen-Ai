export interface CallTranscript {
  callSid: string;
  type: 'manual' | 'ai';
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  transcript?: string;         // texto completo de la transcripción
  recordingUrl?: string;       // URL del audio en Twilio
  aiSummary?: string;          // resumen generado por DeepSeek
  status: 'in-progress' | 'completed' | 'failed';
}

// Configuración del agente IA específica de cada negocio/cuenta.
// Se guarda en users/{uid}.aiCallConfig y el backend la inyecta en el guion
// y en el prompt de DeepSeek. El comportamiento base del agente (tono, reglas,
// duración de respuesta) NO es configurable aquí — eso lo controla la plataforma.
export interface AiCallConfig {
  businessName?: string;   // Nombre del negocio que se menciona al inicio de la llamada
  services?: string;       // Qué ofrece el negocio (productos/servicios)
  customContext?: string;  // Contexto libre adicional (promos, público objetivo, datos clave, etc.)
  closingGoal?: string;    // Objetivo de la llamada (ej: "agendar una reunión", "conseguir el email")
}

export interface Lead {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  type: string;
  zipCode?: string;
  id?: string;
  createdAt?: any;
  userId?: string;
  status?: LeadStatus;
  notes?: string;
  aiEvaluated?: boolean;
  emailCampaignContacted?: boolean;
  emailCampaignContactedAt?: string;
  emailCampaignTemplate?: string;
  // Campos de llamadas
  callTranscripts?: CallTranscript[];
  lastCallAt?: string;
  lastCallType?: 'manual' | 'ai';
  totalCalls?: number;
}

export type LeadStatus = 'new' | 'investigated' | 'contacted' | 'interested' | 'not-interested' | 'client';

export type View = 'finder' | 'manager' | 'campaigns' | 'calls' | 'dashboard' | 'billing';
export type ManagerFilter = 'all' | 'with-email' | 'no-website' | 'no-nothing';
