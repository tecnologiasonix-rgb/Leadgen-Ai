/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Database, LogIn, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { auth } from './lib/firebase';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        alert('Este dominio no está autorizado en la Consola de Firebase (Authentication > Settings > Authorized Domains).');
      } else {
        alert(`Error al iniciar sesión: ${err.message}`);
      }
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-16 md:pb-0">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} user={user} />
      
      {/* Background Agent */}
      <AIAgent user={user} visible={currentView === 'finder' || currentView === 'manager'} />

      <main className="flex-1 flex flex-col md:ml-64 p-4 lg:p-10 w-full pt-20 md:pt-10 overflow-x-hidden">
        <div className="w-full max-w-6xl mx-auto">
          {currentView === 'dashboard' && (
            <Dashboard user={user} />
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
            <LeadManager leadService={leadService} user={user} />
          )}
          {currentView === 'campaigns' && (
            <EmailCampaigns />
          )}
          {currentView === 'calls' && (
            <CallCampaigns />
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
