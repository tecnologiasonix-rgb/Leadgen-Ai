/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, LogIn, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { auth, db } from './lib/firebase';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AIAgent } from './components/AIAgent';
import { LeadFinder } from './components/LeadFinder';
import { LeadManager } from './components/LeadManager';
import { EmailCampaigns } from './components/EmailCampaigns';
import { CallCampaigns } from './components/CallCampaigns';
import { Pricing } from './components/Pricing';
import { Settings } from './components/Settings';
import { LeadService } from './services/LeadService';
import { View, Lead } from './types';

const leadService = new LeadService();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Finder State (Persistent)
  const [finderZip, setFinderZip] = useState('');
  const [finderNiche, setFinderNiche] = useState('');
  const [finderLeads, setFinderLeads] = useState<Lead[]>([]);
  const [finderSelected, setFinderSelected] = useState<number[]>([]);

  // Global Leads State (Cached)
  const [globalLeads, setGlobalLeads] = useState<Lead[]>([]);
  const [globalLeadsLoading, setGlobalLeadsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Check localStorage first for immediate display
    const cached = localStorage.getItem(`leads_${user.uid}`);
    if (cached) {
      try {
        setGlobalLeads(JSON.parse(cached));
        setGlobalLeadsLoading(false);
      } catch (e) {}
    }

    const q = query(collection(db, 'leads'), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setGlobalLeads(data);
      setGlobalLeadsLoading(false);
      // Save full array to localStorage to persist across reloads
      localStorage.setItem(`leads_${user.uid}`, JSON.stringify(data));
    }, (error) => {
      console.error('Error fetching leads:', error);
      setGlobalLeadsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      toast.error('Error al iniciar sesión con Google.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Iniciando Ecosistema IA...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-3xl md:rounded-[3rem] shadow-2xl border border-slate-100 text-center space-y-8 md:space-y-10">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-3 animate-pulse">
              <Database className="text-white w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">LeadGen <span className="text-indigo-600">AI</span></h1>
              <p className="text-slate-500 font-medium">Plataforma Profesional de Inteligencia de Ventas</p>
              <div className="pt-2">
                 <a href="https://tecnologiasonix.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-indigo-600 font-black uppercase tracking-widest transition-colors">
                   Un producto de Tecnologías Onix
                 </a>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-slate-200 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Acceder con Google
          </button>

          <p className="text-xs text-slate-400 font-medium px-4">
            Al acceder, aceptas el uso de IA para la prospección comercial ética y el cumplimiento de la GDPR.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0">
      <Toaster position="top-right" richColors />
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />
      
      {/* Background Agent */}
      <AIAgent user={user} visible={currentView === 'finder' || currentView === 'manager'} globalLeads={globalLeads} />

      <main className="md:ml-64 p-4 lg:p-10 pt-20 md:pt-10 overflow-x-hidden min-h-screen flex flex-col">
        <div className="w-full max-w-6xl mx-auto flex-1">
          {currentView === 'dashboard' && (
            <Dashboard user={user} globalLeads={globalLeads} isLoading={globalLeadsLoading} />
          )}
          {currentView === 'finder' && (
            <LeadFinder 
              leadService={leadService} 
              user={user} 
              zipCode={finderZip}
              setZipCode={setFinderZip}
              businessType={finderNiche}
              setBusinessType={setFinderNiche}
              leads={finderLeads}
              setLeads={setFinderLeads}
              selectedLeads={finderSelected}
              setSelectedLeads={setFinderSelected}
            />
          )}
          {currentView === 'manager' && (
            <LeadManager leadService={leadService} user={user} globalLeads={globalLeads} isLoading={globalLeadsLoading} />
          )}
          {currentView === 'campaigns' && (
            <EmailCampaigns globalLeads={globalLeads} isLoading={globalLeadsLoading} />
          )}
          {currentView === 'calls' && (
            <CallCampaigns globalLeads={globalLeads} isLoading={globalLeadsLoading} />
          )}
          {currentView === 'billing' && (
            <Pricing user={user} />
          )}
          {currentView === 'settings' && (
            <Settings user={user} />
          )}
        </div>
      </main>
    </div>
  );
}
