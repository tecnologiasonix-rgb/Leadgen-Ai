import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Phone, PhoneCall, ListFilter, User, Search, Play, PhoneOff, Trash2, Edit3, MessageSquare, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Lead, LeadStatus } from '../types';

export const CallCampaigns: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'phone-only' | 'no-answer'>('phone-only');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    // Check access plan
    import('../services/UserService').then(({ UserService }) => {
      UserService.getUserSubscription(user.uid).then(sub => {
        setHasAccess(sub.plan === 'pro' || sub.plan === 'enterprise');
      });
    });

    const q = query(collection(db, 'leads'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(data);
    });
    return () => unsubscribe();
  }, [user]);

  // Solo leads que tengan TEFELONO
  const leadsWithPhone = leads.filter(l => !!l.phone?.trim() && l.phone !== 'No disponible');

  const handleDeleteLead = async (leadId: string) => {
    toast('¿Estás seguro de que quieres eliminar este prospecto?', {
      action: {
        label: 'Eliminar',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, "leads", leadId));
            toast.success('Prospecto eliminado');
          } catch (error) {
            console.error("Error al eliminar el prospecto:", error);
            toast.error('Hubo un error al eliminar el prospecto.');
          }
        }
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {}
      }
    });
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

  const filteredLeads = leadsWithPhone.filter(l => {
    // Buscar
    if (searchQuery && !l.name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Filtros
    if (activeFilter === 'phone-only') {
      // Tiene telefono, PERO NO tiene Email o NO tiene web
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

  const isMobileFunc = (phone?: string) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/\D/g, '');
    const localPart = cleanPhone.startsWith('34') ? cleanPhone.substring(2) : cleanPhone;
    return !localPart.startsWith('9') && !localPart.startsWith('8');
  };

  if (hasAccess === false) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-rose-200 mt-20 max-w-lg mx-auto text-center shadow-lg">
        <PhoneOff className="w-16 h-16 text-rose-500 mb-6" />
        <h2 className="text-2xl font-black text-slate-900 mb-4">Campañas de Llamadas Limitadas</h2>
        <p className="text-slate-600 mb-8 font-medium">Esta funcionalidad solo está disponible en los planes Pro y Enterprise. Mejora tu plan para acceder.</p>
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
          <p className="text-gray-500 text-sm">Gestiona leads y prospectos configurados para campañas telefónicas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-slate-400" />
              <select 
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="text-sm bg-slate-50 border-none outline-none font-medium cursor-pointer rounded-lg py-2"
              >
                <option value="all">Todos con Teléfono</option>
                <option value="phone-only">Filtro 'Teléfono Only' (Sin web o sin email)</option>
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
               <span className="text-sm font-semibold text-emerald-800">
                 {filteredLeads.length} leads listos para llamar
               </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
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
                    className="p-4 hover:bg-slate-50 transition-colors block"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(lead.status)}`}>
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{lead.name}</div>
                            <div className="text-sm text-slate-500 flex flex-col sm:flex-row gap-1 sm:gap-4 mt-1">
                               <span className="font-medium text-emerald-600">{lead.phone}</span>
                               {(lead.email && lead.email !== 'No disponible') && <span className="text-xs text-slate-400">{lead.email}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => updateStatus(lead.id!, e.target.value as LeadStatus)}
                            className={`text-xs font-semibold px-2 py-1 rounded-full outline-none cursor-pointer border-none appearance-none ${getStatusColor(lead.status || 'new')}`}
                          >
                            <option value="new">Nuevo</option>
                            <option value="investigated">Investigado (IA)</option>
                            <option value="contacted">Contactado</option>
                            <option value="interested">Interesado</option>
                            <option value="not-interested">Rechazado</option>
                            <option value="client">Cliente</option>
                          </select>
                          {lead.phone && isMobileFunc(lead.phone) && (
                            <a 
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '').length === 9 ? '34' + lead.phone.replace(/\D/g, '') : lead.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              onClick={() => updateStatus(lead.id!, 'contacted')}
                              className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors active:scale-95 flex items-center justify-center"
                              title="Enviar WhatsApp"
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                            </a>
                          )}
                          <a 
                            href={`tel:${lead.phone}`}
                            onClick={() => updateStatus(lead.id!, 'contacted')}
                            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors active:scale-95 flex items-center justify-center"
                            title="Llamar"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => {
                              if (editingNotes === lead.id) {
                                setEditingNotes(null);
                              } else {
                                setEditingNotes(lead.id!);
                                setTempNotes(lead.notes || '');
                              }
                            }}
                            className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors active:scale-95"
                            title="Notas"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id!)}
                            className="p-3 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-500 rounded-full transition-colors active:scale-95"
                            title="Eliminar prospecto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Notas o input de notas */}
                      <AnimatePresence>
                        {editingNotes === lead.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 flex gap-2">
                              <input
                                type="text"
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="Escribe una nota sobre la llamada..."
                                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveNotes(lead.id!);
                                }}
                              />
                              <button
                                onClick={() => saveNotes(lead.id!)}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingNotes(null)}
                                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {lead.notes && editingNotes !== lead.id && (
                        <div className="bg-yellow-50/50 border border-yellow-100 p-3 rounded-lg text-sm text-slate-700 flex justify-between items-start cursor-pointer" onClick={() => { setEditingNotes(lead.id!); setTempNotes(lead.notes || ''); }}>
                          <span className="italic">" {lead.notes} "</span>
                          <Edit3 className="w-3 h-3 text-slate-400 flex-shrink-0 ml-2 mt-1" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
            <h3 className="font-bold text-xl mb-2 flex flex-col">
              <span className="text-emerald-200 text-sm font-medium uppercase tracking-wider mb-1">Coming Soon</span>
              Llamadas Autónomas con IA
            </h3>
            <p className="text-sm text-emerald-100 mb-6 leading-relaxed">
              Próximamente, podrás lanzar campañas automatizadas donde un agente de <strong>IA Conversacional</strong> llamará a tus prospectos usando una voz ultra-realista, calificando leads y reservando citas en tu calendario.
            </p>

            <button disabled className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-md cursor-not-allowed">
              <Play className="w-4 h-4" />
              Lanzar Agente IA (Próximamente)
            </button>
            <p className="text-[10px] text-emerald-200/60 text-center mt-3">Integración con Vapi / Twilio en desarrollo.</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-900 mb-4">Guión Recomendado</h3>
             <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed font-serif italic border-l-4 border-emerald-300">
                "Hola, ¿qué tal? Te llamo de Tecnologías Onix. Estaba revisando negocios locales en la zona y noté que tu empresa tiene oportunidades de digitalización que te ayudarían a ahorrar costes o aumentar clientes. ¿Te importaría si en 3 minutos te cuento cómo lo están logrando negocios similares?"
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
