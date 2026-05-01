import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Globe, Trash2, Download, Copy, Database, Loader2, Filter, AlertCircle, Edit3, MessageSquare, Check, X, PhoneCall, Sparkles, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs, writeBatch, getDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LeadService } from '../services/LeadService';
import { AIEvaluator, AI_EVAL_PROFILES, AIEvalProfile } from '../services/AIEvaluator';
import { Lead, ManagerFilter, LeadStatus } from '../types';

interface LeadManagerProps {
  leadService: LeadService;
  user: any;
}

export const LeadManager: React.FC<LeadManagerProps> = ({ leadService, user }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ManagerFilter>('all');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [evaluatingLeadId, setEvaluatingLeadId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('restaurantes');
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const selectedProfile = useMemo(() => {
    return AI_EVAL_PROFILES.find(p => p.id === selectedProfileId);
  }, [selectedProfileId]);

  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    const path = 'leads';
    const q = query(
      collection(db, path),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Firestore] Snapshot recibida. Documentos: ${snapshot.docs.length}`);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        if (!d.userId) {
          console.warn(`Lead ${doc.id} no tiene userId!`);
        }
        return {
          id: doc.id,
          ...d
        };
      }) as Lead[];
      setLeads(data);
      setIsLoading(false);
    }, (error) => {
      console.error('[Firestore] Error en snapshot:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const filteredLeads = useMemo(() => {
    switch (activeFilter) {
      case 'with-email':
        return leads.filter(l => !!l.email?.trim());
      case 'no-website':
        return leads.filter(l => !l.website?.trim());
      case 'no-nothing':
        return leads.filter(l => !l.email?.trim() && !l.website?.trim());
      default:
        return leads;
    }
  }, [leads, activeFilter]);

  const counts = useMemo(() => ({
    all: leads.length,
    withEmail: leads.filter(l => !!l.email?.trim()).length,
    noWebsite: leads.filter(l => !l.website?.trim()).length,
    noNothing: leads.filter(l => !l.email?.trim() && !l.website?.trim()).length,
  }), [leads]);

  const downloadCSV = async () => {
    if (filteredLeads.length === 0) return;
    
    const { UserService } = await import('../services/UserService');
    const subscription = await UserService.getUserSubscription(user.uid);
    
    let exportData = filteredLeads;
    if (subscription.plan === 'free') {
      if (exportData.length > 3) {
        exportData = exportData.slice(0, 3);
        toast.error('Plan Gratuito: Solo se han exportado 3 leads. Mejora a Pro para exportar todos.');
      }
    }

    const headers = ['Nombre', 'Dirección', 'Teléfono', 'Email', 'Web', 'Tipo', 'CP', 'Estado', 'Notas'];
    const rows = exportData.map(l => [
      l.name, l.address, l.phone || '', l.email || '', l.website || '', l.type || '', l.zipCode || '', l.status || 'Nuevo', l.notes || ''
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_manager_${activeFilter}.csv`);
    link.click();
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!leadId) {
      console.error('No leadId provided to handleDeleteLead');
      return;
    }
    
    setIsLoading(true);
    console.log(`[UI] Intentando borrar lead (ID: ${leadId})`);
    try {
      await deleteDoc(doc(db, "leads", leadId));
      console.log(`[UI] Lead ${leadId} borrado con éxito de Firestore.`);
    } catch (err) {
      console.error('[UI] Error crítico al borrar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (leads.length === 0) return;
    
    setIsLoading(true);
    console.log(`[UI] Intentando borrar TODOS los leads (Total: ${leads.length}) para ${user.uid}`);
    try {
      const q = query(collection(db, "leads"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No hay leads para borrar.');
        return;
      }

      const batch = writeBatch(db);
      snapshot.forEach((d) => {
        batch.delete(doc(db, "leads", d.id));
      });
      
      await batch.commit();
      console.log('[UI] Borrado total exitoso.');
    } catch (err) {
      console.error('[UI] Error crítico al borrar todo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (leadId: string, status: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
    }
  };

  const saveNotes = async (leadId: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { notes: tempNotes });
      setEditingNotes(null);
    } catch (error) {
      console.error("Error al guardar notas:", error);
    }
  };

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

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'new': return 'Nuevo';
      case 'investigated': return 'Investigado';
      case 'contacted': return 'Contactado';
      case 'interested': return 'Interesado';
      case 'not-interested': return 'Rechazado';
      case 'client': return 'Cliente';
      default: return 'Sin estado';
    }
  };

  const handleAIEvaluate = async (lead: Lead) => {
    if (!lead.id) return;
    
    try {
      const { UserService } = await import('../services/UserService');
      const subscription = await UserService.getUserSubscription(user.uid);
      const userDocRef = doc(db, 'userStats', user.uid);
      const docSnap = await getDoc(userDocRef);
      let aiEvalUses = 0;
      if (docSnap.exists()) {
        aiEvalUses = docSnap.data()?.aiEvalUses || 0;
      }

      if (subscription.plan === 'free' && aiEvalUses >= 3) {
        toast.error('Límite del plan Gratuito alcanzado (3 evaluaciones de IA). Mejora tu plan a Pro.');
        return;
      }

      setEvaluatingLeadId(lead.id);

      await AIEvaluator.evaluateLead(lead, selectedProfile);
      
      await setDoc(userDocRef, { aiEvalUses: increment(1) }, { merge: true });
    } catch (e) {
      console.error(e);
      toast.error('Error al evaluar lead con IA');
    } finally {
      setEvaluatingLeadId(null);
    }
  };

  const isMobileFunc = (phone?: string) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    const localPart = cleanPhone.startsWith('34') ? cleanPhone.substring(2) : cleanPhone;
    return !localPart.startsWith('9') && !localPart.startsWith('8');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900">Lead Manager</h2>
          <p className="text-slate-500 text-sm">Gestiona tu base de datos y segmenta para tus campañas.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50 p-4 rounded-3xl border border-slate-200">
          <div className="space-y-1 flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enfoque de la Investigación IA</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-bold px-4 py-2.5 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm min-w-[200px]"
              >
                {AI_EVAL_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="text-xs text-slate-500 italic flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-purple-500" />
                La IA buscará: {selectedProfile?.targetDescription} analizando {selectedProfile?.instructions.split('\n').map(i => i.replace(/^\d+\.\s*/, '')).join(', ').toLowerCase()}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              disabled={leads.length === 0 || isLoading}
              onClick={handleDeleteAll}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Borrar Base
            </button>
            <button 
              onClick={downloadCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> Exportar ({filteredLeads.length})
            </button>
          </div>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { id: 'all', label: 'Todos', count: counts.all, icon: Database, color: 'indigo' },
          { id: 'with-email', label: 'Con Email', count: counts.withEmail, icon: Mail, color: 'blue' },
          { id: 'no-website', label: 'Sin Web', count: counts.noWebsite, icon: Globe, color: 'orange' },
          { id: 'no-nothing', label: 'Sin Nada', count: counts.noNothing, icon: AlertCircle, color: 'red' },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id as ManagerFilter)}
            className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all text-left space-y-2 md:space-y-4 shadow-sm ${
              activeFilter === filter.id 
                ? 'bg-white border-indigo-600 shadow-lg shadow-indigo-100/50' 
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${
              activeFilter === filter.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <filter.icon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">{filter.label}</div>
              <div className="text-xl md:text-2xl font-black text-slate-900">{filter.count}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 md:p-32 text-center">
            <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Cargando base de datos...</p>
          </div>
        ) : filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] md:min-w-0">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 md:px-8 md:py-5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Negocio</th>
                  <th className="px-4 py-3 md:px-8 md:py-5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                  <th className="px-4 py-3 md:px-8 md:py-5 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-4 py-3 md:px-8 md:py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 md:px-8 md:py-6">
                      <div className="font-bold text-slate-900">{lead.name}</div>
                      <div className="text-xs text-slate-400">{lead.address}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {lead.zipCode && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-bold">{lead.zipCode}</span>}
                        {lead.website ? (
                          <span className="bg-green-50 text-green-600 text-[10px] font-black uppercase px-1.5 py-0.5 rounded border border-green-100 flex items-center"><Globe className="w-3 h-3 mr-1" /> Web</span>
                        ) : (
                          <span className="bg-orange-50 text-orange-600 text-[10px] font-black uppercase px-1.5 py-0.5 rounded border border-orange-100">Sin Web</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-8 md:py-6">
                      <div className="space-y-1">
                        {lead.email ? (
                          <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-blue-600">
                            <Mail className="w-3.5 h-3.5" /> <span className="truncate max-w-[150px] md:max-w-xs">{lead.email}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300 font-black uppercase">Sin Email</div>
                        )}
                        {lead.phone && <div className="text-[10px] md:text-xs text-slate-500 font-medium">{lead.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4 md:px-8 md:py-6">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                        className={`text-[10px] md:text-xs font-bold px-2 py-1.5 md:px-3 md:py-2 rounded-lg outline-none cursor-pointer border-none appearance-none ${getStatusColor(lead.status || 'new')}`}
                      >
                        <option value="new">Nuevo Prospecto</option>
                        <option value="investigated">Investigado (IA)</option>
                        <option value="contacted">Contactado</option>
                        <option value="interested">Interesado / Potencial</option>
                        <option value="not-interested">Rechazado</option>
                        <option value="client">Cliente Cerrado</option>
                      </select>
                      
                      <div className="mt-2 md:mt-3 relative">
                        <AnimatePresence>
                          {editingNotes === lead.id ? (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                              className="flex gap-1 md:gap-2"
                            >
                              <input
                                type="text"
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="Nota..."
                                className="w-24 md:flex-1 md:w-auto text-[10px] md:text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveNotes(lead.id!);
                                }}
                              />
                              <button onClick={() => saveNotes(lead.id!)} className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setEditingNotes(null)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"><X className="w-3 h-3" /></button>
                            </motion.div>
                          ) : (
                            <div 
                              className="text-[10px] md:text-xs text-slate-500 group-hover:text-slate-700 cursor-pointer flex items-center min-h-[20px]"
                              onClick={() => { setEditingNotes(lead.id!); setTempNotes(lead.notes || ''); }}
                            >
                              {lead.notes ? (
                                <div className="flex gap-1.5 items-start">
                                  <MessageSquare className="w-3 md:w-3.5 h-3 md:h-3.5 flex-shrink-0 text-slate-400 mt-0.5" />
                                  <span className="italic line-clamp-2 md:line-clamp-2" title={lead.notes}>{lead.notes}</span>
                                </div>
                              ) : (
                                <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-blue-500"><Edit3 className="w-3 h-3" /> Añadir nota</span>
                              )}
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                    <td className="px-2 py-4 md:px-8 md:py-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleAIEvaluate(lead)}
                          disabled={evaluatingLeadId === lead.id || lead.aiEvaluated}
                          className="p-2 text-slate-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 group/ai relative"
                          title={lead.aiEvaluated ? "Ya evaluado por IA" : "Evaluar con IA"}
                        >
                          {evaluatingLeadId === lead.id ? (
                            <Loader2 className="w-5 h-5 flex-shrink-0 animate-spin text-purple-500" />
                          ) : (
                            <Sparkles className="w-5 h-5 flex-shrink-0" />
                          )}
                          <div className="absolute opacity-0 group-hover/ai:opacity-100 bg-purple-900 text-white text-[10px] font-bold px-2 py-1 rounded -top-8 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap transition-opacity">Evaluar con IA</div>
                        </button>
                        {lead.phone && (
                          <a 
                            href={`tel:${lead.phone}`}
                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center group/btn relative"
                            title="Llamar"
                          >
                            <PhoneCall className="w-5 h-5 flex-shrink-0" />
                          </a>
                        )}
                        {lead.phone && isMobileFunc(lead.phone) && (
                          <a 
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '').length === 9 ? '34' + lead.phone.replace(/\D/g, '') : lead.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center relative group/btn"
                            title="Enviar WhatsApp"
                          >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        )}
                        <button 
                           onClick={() => lead.id && handleDeleteLead(lead.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center relative group/btn"
                        >
                          <Trash2 className="w-5 h-5 flex-shrink-0" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-32 text-center space-y-6">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
              <Filter className="text-slate-200 w-8 h-8" />
            </div>
            <p className="text-slate-400 font-bold">No hay leads que coincidan con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
};
