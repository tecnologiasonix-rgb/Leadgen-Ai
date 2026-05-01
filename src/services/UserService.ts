import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface UserSubscription {
  plan: 'free' | 'startup' | 'pro' | 'enterprise';
  leadsLimit: number;
  leadsUsed: number;
  stripeCustomerId?: string;
  subscriptionStatus?: string;
}

const DEFAULT_PLAN: UserSubscription = {
  plan: 'enterprise',
  leadsLimit: 999999,
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
      plan: data.plan || 'enterprise',
      leadsLimit: data.leadsLimit ?? 999999,
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
        plan: 'enterprise',
        leadsLimit: 999999,
        leadsUsed: count,
        createdAt: new Date().toISOString()
      });
    } else {
      await updateDoc(userRef, {
        leadsUsed: increment(count)
      });
    }
  }
};
