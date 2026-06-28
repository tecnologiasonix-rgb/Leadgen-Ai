import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Lead } from '../types';
import { Sparkles, Play, Square, Loader2, X } from 'lucide-react';
import { AIEvaluator, AI_EVAL_PROFILES, AIEvalProfile } from '../services/AIEvaluator';

export const AIAgent: React.FC<{ user: User; visible?: boolean, globalLeads?: Lead[] }> = ({ user, visible = true, globalLeads = [] }) => {
  const leads = globalLeads;
  const [isRunning, setIsRunning] = useState(false);
  const [currentEvalId, setCurrentEvalId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<AIEvalProfile>(AI_EVAL_PROFILES[0]);

  // Ref keeps leads fresh inside the async loop without being an effect dependency,
  // preventing Firestore onSnapshot updates from re-triggering the effect mid-cycle.
  const leadsRef = useRef(leads);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  // isProcessingRef prevents a second loop instance from spawning if React
  // re-runs the effect while the async loop is still awaiting.
  const isProcessingRef = useRef(false);

  // shouldStopRef lets the loop exit cleanly after the current lead finishes,
  // regardless of when React schedules the re-render from setIsRunning(false).
  const shouldStopRef = useRef(false);

  const pendingLeads = leads.filter(l => !l.aiEvaluated);

  useEffect(() => {
    if (!isRunning) {
      // Signal any in-flight loop to exit after its current step.
      shouldStopRef.current = true;
      return;
    }

    // Guard: only one loop instance at a time.
    if (isProcessingRef.current) return;

    shouldStopRef.current = false;
    isProcessingRef.current = true;

    const run = async () => {
      try {
        while (!shouldStopRef.current) {
          // Read fresh leads on every iteration via ref — avoids stale closure.
          const pending = leadsRef.current.filter(l => !l.aiEvaluated);

          if (pending.length === 0) {
            setIsRunning(false);
            break;
          }

          const nextLead = pending[0];
          setCurrentEvalId(nextLead.id ?? null);

          try {
            await AIEvaluator.evaluateLead(nextLead, selectedProfile);
          } catch (err) {
            console.error('AI Auto-agent error:', err);
          }

          setCurrentEvalId(null);

          // Only pause if the agent hasn't been stopped during the evaluation.
          if (!shouldStopRef.current) {
            await new Promise<void>(resolve => setTimeout(resolve, 12000));
          }
        }
      } finally {
        isProcessingRef.current = false;
        setCurrentEvalId(null);
      }
    };

    run();
  }, [isRunning]); // pendingLeads deliberately excluded — read via leadsRef inside the loop

  if (!visible) return null;
  if (pendingLeads.length === 0 && !isRunning && !isOpen) return null;

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 text-white p-3 md:p-4 rounded-full shadow-2xl hover:bg-purple-700 hover:scale-105 transition-all outline-none flex items-center justify-center animate-in slide-in-from-bottom-5"
          title="Abrir Auto-Agente IA"
        >
          {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 p-4 w-72 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600">
              <Sparkles className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-800">Auto-Agente IA</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {pendingLeads.length} ptos
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
                title="Minimizar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <p className="text-xs text-slate-500">
            Evaluación automática de leads en segundo plano.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Perfil de evaluación</label>
            <select
              value={selectedProfile.id}
              onChange={e => {
                const p = AI_EVAL_PROFILES.find(p => p.id === e.target.value);
                if (p) setSelectedProfile(p);
              }}
              disabled={isRunning}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {AI_EVAL_PROFILES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {isRunning ? (
              <button
                onClick={() => setIsRunning(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Square className="w-4 h-4 fill-current" /> Detener
              </button>
            ) : (
              <button
                onClick={() => setIsRunning(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" /> Iniciar
              </button>
            )}
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-slate-400 justify-center mt-1">
              <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
              Procesando lead...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
