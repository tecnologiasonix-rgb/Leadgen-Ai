import React, { useState, useEffect } from 'react';
import { deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import {
  Phone, PhoneCall, ListFilter, User, Search, PhoneOff,
  Trash2, Edit3, MessageSquare, Check, X, Bot, Clock,
  FileText, ChevronDown, ChevronUp, Mic, StopCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Lead, LeadStatus, CallTranscript } from '../types';

// ─── Componente: Panel de transcripciones ───────────────────────────────────
const TranscriptPanel: React.FC<{ transcripts: CallTranscript[] }> = ({ transcripts }) => {
  const [open, setOpen] = useState(false);
  if (!transcripts || transcripts.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        {transcripts.length} {transcripts.length === 1 ? 'conversación guardada' : 'conversaciones guardadas'}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2 space-y-3"
          >
            {[...transcripts].reverse().map((t, i) => (
              <div key={t.callSid + i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {t.type === 'ai'
                      ? <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold"><Bot className="w-3 h-3" /> IA</span>
                      : <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold"><Phone className="w-3 h-3" /> Manual</span>
                    }
                    <span className="text-slate-400">{new Date(t.startedAt).toLocaleString('es-ES')}</span>
                  </div>
                  {t.durationSeconds && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" /> {Math.floor(t.durationSeconds / 60)}:{String(t.durationSeconds % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                {t.aiSummary && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-2 mb-2">
                    <p className="font-semibold text-purple-700 mb-0.5">Resumen IA:</p>
                    <p className="text-slate-700">{t.aiSummary}</p>
                  </div>
                )}

                {t.transcript && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-slate-500 hover:text-slate-700 select-none">Ver transcripción completa</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">{t.transcript}</pre>
                  </details>
                )}

                {t.recordingUrl && (
                  <a href={t.recordingUrl} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800">
                    <Mic className="w-3 h-3" /> Escuchar grabación
                  </a>
                )}

                {t.status === 'in-progress' && (
                  <p className="text-yellow-600 flex items-center gap-1 mt-1"><StopCircle className="w-3 h-3 animate-pulse" /> Llamada en curso...</p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Componente: Botones de llamada ─────────────────────────────────────────
const CallButtons: React.FC<{ lead: Lead; onManualCall: () => void; onAiCall: () => void; aiLoading: boolean }> = ({
  lead, onManualCall, onAiCall, aiLoading
}) => {
  const isMobile = (phone?: string) => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, '');
    const local = clean.startsWith('34') ? clean.substring(2) : clean;
    return !local.startsWith('9') && !local.startsWith('8');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* WhatsApp solo para móviles */}
      {isMobile(lead.phone) && (
        <a
          href={`https://wa.me/${lead.phone.replace(/\D/g, '').length === 9 ? '34' + lead.phone.replace(/\D/g, '') : lead.phone.replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          onClick={onManualCall}
          className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors active:scale-95 flex items-center justify-center"
          title="Enviar WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}

      {/* Llamada manual */}
      <a
        href={`tel:${lead.phone}`}
        onClick={onManualCall}
        className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-semibold transition-colors active:scale-95"
        title="Llamar ahora (manual)"
      >
        <PhoneCall className="w-3.5 h-3.5" />
        Llamar
      </a>

      {/* Llamada con IA via Twilio */}
      <button
        onClick={onAiCall}
        disabled={aiLoading}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-colors active:scale-95 ${
          aiLoading
            ? 'bg-purple-200 text-purple-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 text-white'
        }`}
        title="Lanzar agente IA (Twilio)"
      >
        {aiLoading ? (
          <><span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Llamando...</>
        ) : (
          <><Bot className="w-3.5 h-3.5" /> Llamar con IA</>
        )}
      </button>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
export const CallCampaigns: React.FC<{ globalLeads: Lead[], isLoading: boolean }> = ({ globalLeads, isLoading }) => {
  const leads = globalLeads;
  const [activeFilter, setActiveFilter] = useState<'all' | 'phone-only'>('phone-only');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [aiCallingId, setAiCallingId] = useState<string | null>(null);  // lead.id que está siendo llamado por IA

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    import('../services/UserService').then(({ UserService }) => {
      UserService.getUserSubscription(user.uid).then(sub => {
        setHasAccess(sub.plan === 'pro' || sub.plan === 'enterprise');
      });
    });
  }, [user]);

  const leadsWithPhone = leads.filter(l => !!l.phone?.trim() && l.phone !== 'No disponible');

  const filteredLeads = leadsWithPhone.filter(l => {
    if (searchQuery && !l.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter === 'phone-only') {
      const noEmail = !l.email?.trim() || l.email === 'No disponible';
      const noWeb = !l.website?.trim() || l.website === 'No disponible';
      return noEmail || noWeb;
    }
    return true;
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'investigated': return 'bg-purple-100 text-purple-700';
      case 'contacted': return 'bg-yellow-100 text-yellow-700';
      case 'interested': return 'bg-emerald-100 text-emerald-700';
      case 'not-interested': return 'bg-red-100 text-red-700';
      case 'client': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    try { await updateDoc(doc(db, 'leads', leadId), { status }); }
    catch (e) { console.error(e); }
  };

  const saveNotes = async (leadId: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { notes: tempNotes });
      setEditingNotes(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteLead = async (leadId: string) => {
    toast('¿Eliminar este prospecto?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'leads', leadId));
            toast.success('Prospecto eliminado');
          } catch { toast.error('Error al eliminar'); }
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    });
  };

  // ── Registrar llamada manual en Firestore ──────────────────────────────────
  const handleManualCall = async (lead: Lead) => {
    if (!lead.id) return;
    const transcript: CallTranscript = {
      callSid: `manual_${Date.now()}`,
      type: 'manual',
      startedAt: new Date().toISOString(),
      status: 'completed',
    };
    try {
      await updateDoc(doc(db, 'leads', lead.id), {
        status: 'contacted',
        lastCallAt: new Date().toISOString(),
        lastCallType: 'manual',
        totalCalls: (lead.totalCalls || 0) + 1,
        callTranscripts: arrayUnion(transcript),
      });
      toast.success(`Llamada registrada para ${lead.name}`);
    } catch (e) {
      console.error('Error registrando llamada manual:', e);
    }
  };

  // ── Lanzar llamada con IA via Twilio ──────────────────────────────────────
  const handleAiCall = async (lead: Lead) => {
    if (!lead.id || !lead.phone) return;
    if (!user) { toast.error('Debes estar autenticado'); return; }

    setAiCallingId(lead.id);
    toast.info(`Iniciando llamada IA a ${lead.name}...`);

    try {
      const response = await fetch('/api/calls/ai-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          leadName: lead.name,
          phone: lead.phone,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error desconocido');

      // Registrar la llamada como "in-progress" inmediatamente
      const transcript: CallTranscript = {
        callSid: data.callSid || `twilio_${Date.now()}`,
        type: 'ai',
        startedAt: new Date().toISOString(),
        status: 'in-progress',
      };

      await updateDoc(doc(db, 'leads', lead.id), {
        status: 'contacted',
        lastCallAt: new Date().toISOString(),
        lastCallType: 'ai',
        totalCalls: (lead.totalCalls || 0) + 1,
        callTranscripts: arrayUnion(transcript),
      });

      toast.success(`Agente IA llamando a ${lead.name} (${lead.phone}). La transcripción aparecerá cuando termine.`);
    } catch (error) {
      console.error('Error en llamada IA:', error);
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setAiCallingId(null);
    }
  };

  // ── Bloqueo por plan ──────────────────────────────────────────────────────
  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-rose-200 mt-20 max-w-lg mx-auto text-center shadow-lg">
        <PhoneOff className="w-16 h-16 text-rose-500 mb-6" />
        <h2 className="text-2xl font-black text-slate-900 mb-4">Campañas de Llamadas Limitadas</h2>
        <p className="text-slate-600 mb-8 font-medium">Esta funcionalidad solo está disponible en los planes Pro y Enterprise.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="w-6 h-6 text-emerald-500" />
            Campañas de Llamadas
          </h2>
          <p className="text-gray-500 text-sm">Llama manualmente o lanza un agente IA que llama y transcribe la conversación.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Lista de leads ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {/* Filtros */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-slate-400" />
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="text-sm bg-slate-50 border-none outline-none font-medium cursor-pointer rounded-lg py-2"
              >
                <option value="all">Todos con Teléfono</option>
                <option value="phone-only">Teléfono Only (sin web o email)</option>
              </select>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar prospecto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <span className="text-sm font-semibold text-emerald-800">
                {filteredLeads.length} leads listos para llamar
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>Manual</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>IA</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                  <PhoneOff className="w-8 h-8 text-slate-300 mb-2" />
                  <p>No se encontraron prospectos con estos filtros.</p>
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={lead.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Cabecera del lead */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex gap-3 items-center min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(lead.status)}`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">{lead.name}</div>
                            <div className="text-sm text-slate-500 flex flex-col sm:flex-row gap-1 sm:gap-3 mt-0.5">
                              <span className="font-medium text-emerald-600">{lead.phone}</span>
                              {lead.email && lead.email !== 'No disponible' && (
                                <span className="text-xs text-slate-400 truncate">{lead.email}</span>
                              )}
                            </div>
                            {/* Indicador de llamadas previas */}
                            {(lead.totalCalls || 0) > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {lead.totalCalls} {lead.totalCalls === 1 ? 'llamada' : 'llamadas'}
                                  {lead.lastCallType && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full font-semibold ${
                                      lead.lastCallType === 'ai'
                                        ? 'bg-purple-100 text-purple-600'
                                        : 'bg-blue-100 text-blue-600'
                                    }`}>
                                      {lead.lastCallType === 'ai' ? 'IA' : 'Manual'}
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Controles derecha */}
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full outline-none cursor-pointer border-none appearance-none ${getStatusColor(lead.status || 'new')}`}
                          >
                            <option value="new">Nuevo</option>
                            <option value="investigated">Investigado</option>
                            <option value="contacted">Contactado</option>
                            <option value="interested">Interesado</option>
                            <option value="not-interested">Rechazado</option>
                            <option value="client">Cliente</option>
                          </select>

                          <button
                            onClick={() => {
                              setEditingNotes(editingNotes === lead.id ? null : lead.id!);
                              setTempNotes(lead.notes || '');
                            }}
                            className="p-2.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors active:scale-95"
                            title="Notas"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteLead(lead.id!)}
                            className="p-2.5 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 rounded-full transition-colors active:scale-95"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Botones de llamada */}
                      <CallButtons
                        lead={lead}
                        onManualCall={() => handleManualCall(lead)}
                        onAiCall={() => handleAiCall(lead)}
                        aiLoading={aiCallingId === lead.id}
                      />

                      {/* Notas */}
                      <AnimatePresence>
                        {editingNotes === lead.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="Escribe una nota sobre la llamada..."
                                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') saveNotes(lead.id!); }}
                              />
                              <button onClick={() => saveNotes(lead.id!)} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingNotes(null)} className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {lead.notes && editingNotes !== lead.id && (
                        <div
                          className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-lg text-sm text-slate-700 flex justify-between items-start cursor-pointer"
                          onClick={() => { setEditingNotes(lead.id!); setTempNotes(lead.notes || ''); }}
                        >
                          <span className="italic">"{lead.notes}"</span>
                          <Edit3 className="w-3 h-3 text-slate-400 flex-shrink-0 ml-2 mt-1" />
                        </div>
                      )}

                      {/* Transcripciones */}
                      {lead.callTranscripts && lead.callTranscripts.length > 0 && (
                        <TranscriptPanel transcripts={lead.callTranscripts} />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Panel lateral ── */}
        <div className="col-span-1 space-y-6">

          {/* Cómo funciona la IA */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10" />
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-200" />
              Agente IA activo
            </h3>
            <div className="space-y-2 text-sm text-purple-100 mb-5">
              <div className="flex items-start gap-2"><span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span><span>Pulsas <strong className="text-white">Llamar con IA</strong> en el lead</span></div>
              <div className="flex items-start gap-2"><span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span><span>Twilio llama al número de teléfono del prospecto</span></div>
              <div className="flex items-start gap-2"><span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span><span>El agente habla y responde usando DeepSeek en tiempo real</span></div>
              <div className="flex items-start gap-2"><span className="bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span><span>La conversación queda grabada y transcrita automáticamente</span></div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-xs text-purple-200 border border-white/20">
              <p className="font-semibold text-white mb-1 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Requiere configurar:</p>
              <p>• <code className="bg-white/10 px-1 rounded">TWILIO_ACCOUNT_SID</code></p>
              <p>• <code className="bg-white/10 px-1 rounded">TWILIO_AUTH_TOKEN</code></p>
              <p>• <code className="bg-white/10 px-1 rounded">TWILIO_PHONE_NUMBER</code></p>
              <p className="mt-1 text-purple-300">Añádelas al <code className="bg-white/10 px-1 rounded">.env</code> del servidor.</p>
            </div>
          </div>

          {/* Guión recomendado */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4">Guión Recomendado</h3>
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed font-serif italic border-l-4 border-emerald-300">
              "Hola, ¿qué tal? Te llamo de Tecnologías Onix. Estaba revisando negocios locales en la zona y noté que tu empresa tiene oportunidades de digitalización que te ayudarían a ahorrar costes o aumentar clientes. ¿Te importaría si en 3 minutos te cuento cómo lo están logrando negocios similares?"
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-700 text-sm mb-3">Resumen de campaña</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-600">{leadsWithPhone.length}</p>
                <p className="text-xs text-blue-500 font-medium">Con teléfono</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-600">
                  {leadsWithPhone.filter(l => l.status === 'contacted' || l.status === 'interested' || l.status === 'client').length}
                </p>
                <p className="text-xs text-emerald-500 font-medium">Contactados</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-purple-600">
                  {leadsWithPhone.filter(l => l.lastCallType === 'ai').length}
                </p>
                <p className="text-xs text-purple-500 font-medium">Llamadas IA</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-yellow-600">
                  {leadsWithPhone.filter(l => l.status === 'interested').length}
                </p>
                <p className="text-xs text-yellow-600 font-medium">Interesados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
