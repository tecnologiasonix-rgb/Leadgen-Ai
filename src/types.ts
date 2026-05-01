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
}

export type LeadStatus = 'new' | 'investigated' | 'contacted' | 'interested' | 'not-interested' | 'client';

export type View = 'finder' | 'manager' | 'campaigns' | 'calls' | 'dashboard' | 'billing';
export type ManagerFilter = 'all' | 'with-email' | 'no-website' | 'no-nothing';
