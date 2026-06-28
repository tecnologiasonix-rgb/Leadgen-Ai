import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { AiCallConfig } from '../types';

export interface UserSubscription {
  plan: 'free' | 'startup' | 'pro' | 'enterprise';
  leadsLimit: number;
  leadsUsed: number;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

const DEFAULT_PLAN: UserSubscription = {
  plan: 'free',
  leadsLimit: 3,
  leadsUsed: 0
};

export const UserService = {
  async getUserSubscription(userId: string): Promise<UserSubscription> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return DEFAULT_PLAN;
    }
    
    const data = userSnap.data();
    return {
      plan: data.plan || 'free',
      leadsLimit: data.leadsLimit ?? 3,
      leadsUsed: data.leadsUsed || 0,
      stripeCustomerId: data.stripeCustomerId,
      subscriptionStatus: data.subscriptionStatus
    };
  },

  async incrementLeadsUsed(userId: string, count: number) {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        plan: 'free',
        leadsLimit: 3,
        leadsUsed: count,
        createdAt: new Date().toISOString()
      });
    } else {
      await updateDoc(userRef, {
        leadsUsed: increment(count)
      });
    }
  },

  // ── Configuración del agente IA de llamadas (por negocio/cuenta) ──────────
  async getAiCallConfig(userId: string): Promise<AiCallConfig> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return {};
    const data = userSnap.data();
    return data.aiCallConfig || {};
  },

  async saveAiCallConfig(userId: string, config: AiCallConfig) {
    const userRef = doc(db, 'users', userId);
    // setDoc con merge para no pisar el resto del doc (plan, leadsUsed, etc.)
    // y para que funcione aunque el doc de usuario todavía no exista.
    await setDoc(userRef, { aiCallConfig: config }, { merge: true });
  }
};
