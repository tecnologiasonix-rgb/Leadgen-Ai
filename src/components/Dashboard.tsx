import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Users, Phone, Send, TrendingUp, BarChart3, Database } from 'lucide-react';
import { Lead } from '../types';

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
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const Dashboard: React.FC<{ user: any, globalLeads: Lead[], isLoading: boolean }> = ({ user, globalLeads, isLoading }) => {
  const [emailsSent, setEmailsSent] = useState(0);

  const totalLeads = globalLeads.length;
  const callLeads = globalLeads.filter(l => !!l.phone?.trim() && l.phone !== 'No disponible').length;

  useEffect(() => {
    if (!user) return;

    // Listen to user stats for emails sent
    const unsubscribeStats = onSnapshot(doc(db, 'userStats', user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().emailsSent !== undefined) {
        setEmailsSent(docSnap.data().emailsSent);
      } else {
        setEmailsSent(0);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'userStats');
    });

    return () => {
      unsubscribeStats();
    };
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Bienvenido de nuevo 👋</h2>
        <p className="text-slate-500 text-lg">Aquí tienes el resumen de tu ecosistema de prospección actual.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-blue-600">
              <Database className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Leads Totales</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-black text-slate-900">{totalLeads}</h3>
            </div>
            <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> En tu base de datos
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-red-600">
              <Send className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Emails Enviados</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-black text-slate-900">{emailsSent}</h3>
            </div>
            <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Mediante campañas
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4 text-emerald-600">
              <Phone className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Sección Llamadas</p>
            <div className="flex items-end gap-3">
              <h3 className="text-4xl font-black text-slate-900">{callLeads}</h3>
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Leads con teléfono
            </p>
          </div>
        </div>

      </div>

      <div className="bg-indigo-600 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-20 translate-x-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl translate-y-10 -translate-x-10 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-black tracking-tight">Tienes {totalLeads} leads totales, has enviado {emailsSent} emails, y tienes {callLeads} en la sección de llamadas.</h3>
          <p className="text-indigo-200 font-medium">¡Sigue así! Tu ecosistema está creciendo.</p>
        </div>
        
        <div className="relative z-10 shrink-0">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
