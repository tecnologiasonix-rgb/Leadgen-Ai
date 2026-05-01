import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc, increment, deleteDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { emailService, EMAIL_TEMPLATES } from '../services/EmailService';
import { Mail, Send, Filter, CheckCircle2, AlertCircle, Eye, Users, Plus, Trash2, Bot, Loader2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIEvaluator } from '../services/AIEvaluator';

interface Lead {
  id: string;
  name: string;
  email: string;
  website?: string;
  notes?: string;
  userId: string;
}

interface UserTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  html: string;
  userId: string;
  createdAt: string;
}

export const EmailCampaigns: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<UserTemplate | null>(null);
  
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'no-web' | 'with-web'>('all');
  const [error, setError] = useState<string | null>(null);

  // AI Agent States
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isAIMinimized, setIsAIMinimized] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<UserTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSubject, setNewTemplateSubject] = useState('');

  const [templateToDelete, setTemplateToDelete] = useState<UserTemplate | null>(null);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    
    // Listen to leads
    const qLeads = query(collection(db, 'leads'), where('userId', '==', user.uid));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lead[];
      setLeads(data);
    });

    // Listen to user templates
    const qTemplates = query(collection(db, 'emailTemplates'), where('userId', '==', user.uid));
    const unsubscribeTemplates = onSnapshot(qTemplates, async (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserTemplate[];
      
      // If user has no templates at all, seed with the default ones
      if (data.length === 0 && !localStorage.getItem(`seeded_templates_${user.uid}`)) {
        localStorage.setItem(`seeded_templates_${user.uid}`, 'true');
        for (const t of EMAIL_TEMPLATES) {
          await addDoc(collection(db, 'emailTemplates'), {
            name: t.name,
            subject: t.subject,
            description: t.description,
            html: t.html,
            userId: user.uid,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        setTemplates(data);
        if (data.length > 0 && !selectedTemplate) {
          setSelectedTemplate(data[0]);
        }
      }
    });

    return () => {
      unsubscribeLeads();
      unsubscribeTemplates();
    };
  }, [user]);

  // En Campañas SOLO trabajamos con leads que tengan email.
  const leadsWithEmail = leads.filter(l => !!l.email?.trim());

  const filteredLeads = activeFilter === 'no-web'
    ? leadsWithEmail.filter(l => !l.website || l.website.trim() === '')
    : activeFilter === 'with-web'
    ? leadsWithEmail.filter(l => !!l.website && l.website.trim() !== '')
    : leadsWithEmail;

  const toggleLeadSelection = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedLeads(filteredLeads.map(l => l.id));
  const clearSelection = () => setSelectedLeads([]);

  const handleDeleteTemplate = (template: UserTemplate) => {
    setTemplateToDelete(template);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await deleteDoc(doc(db, 'emailTemplates', templateToDelete.id));
      if (selectedTemplate?.id === templateToDelete.id) {
        setSelectedTemplate(templates.filter(t => t.id !== templateToDelete.id)[0] || null);
      }
      setTemplateToDelete(null);
    } catch (err) {
      console.error(err);
      alert('Error al eliminar plantilla');
    }
  };

  const openAIGenerator = (template?: UserTemplate) => {
    if (template) {
      setTemplateToEdit(template);
      setNewTemplateName(template.name);
      setNewTemplateSubject(template.subject);
    } else {
      setTemplateToEdit(null);
      setNewTemplateName('Nueva Plantilla IA');
      setNewTemplateSubject('Asunto generado por IA');
    }
    setAiPrompt('');
    setShowAIDialog(true);
    setIsAIMinimized(false);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !user) return;
    
    const isEditing = !!templateToEdit;
    const promptDetails = aiPrompt;
    const currentName = newTemplateName;
    const currentSubject = newTemplateSubject;
    const currentHtml = templateToEdit ? templateToEdit.html : undefined;
    const currentEditId = templateToEdit?.id;

    // Remove dialog so the user can see the main UI right away
    setShowAIDialog(false);
    setIsGenerating(true);
    
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'userStats', user.uid);
      const statsSnap = await getDoc(statsRef);
      let dailyUses = 0;
      let lastUsedDate = '';

      if (statsSnap.exists()) {
        const data = statsSnap.data();
        lastUsedDate = data.aiEmailDate || '';
        dailyUses = data.aiEmailUses || 0;
      }

      if (lastUsedDate !== todayDate) {
        dailyUses = 0;
      }

      // No daily limit anymore
      
      const generatedHtml = await AIEvaluator.generateEmailTemplate(
        promptDetails, 
        currentHtml
      );

      await setDoc(statsRef, {
        aiEmailDate: todayDate,
        aiEmailUses: dailyUses + 1,
      }, { merge: true });

      if (isEditing && currentEditId) {
        // Edit existing
        await updateDoc(doc(db, 'emailTemplates', currentEditId), {
          name: currentName,
          subject: currentSubject,
          html: generatedHtml
        });
      } else {
        // Create new
        const newDoc = await addDoc(collection(db, 'emailTemplates'), {
          name: currentName,
          subject: currentSubject,
          description: 'Plantilla generada por IA',
          html: generatedHtml,
          userId: user.uid,
          createdAt: new Date().toISOString()
        });
        setSelectedTemplate({ id: newDoc.id, name: currentName, subject: currentSubject, description: '', html: generatedHtml, userId: user.uid, createdAt: new Date().toISOString() });
      }
    } catch (err) {
      console.error(err);
      alert('Hubo un error al generar la plantilla con IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendCampaign = async () => {
    if (selectedLeads.length === 0 || !selectedTemplate) return;
    
    setIsSending(true);
    setError(null);
    const leadsToSend = leads.filter(l => selectedLeads.includes(l.id));

    try {
      let smtpSettings;
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        smtpSettings = userDoc.data()?.smtpSettings;
      }

      const result = await emailService.sendEmail({
        to: '', 
        subject: selectedTemplate.subject,
        html: selectedTemplate.html,
        leads: leadsToSend,
        userId: user?.uid,
        smtpSettings
      });
      
      setLogs(prev => [{
        timestamp: new Date().toLocaleTimeString(),
        template: selectedTemplate.name,
        count: selectedLeads.length,
        results: result.results
      }, ...prev]);

      if (user) {
        const statsRef = doc(db, 'userStats', user.uid);
        const statsDoc = await getDoc(statsRef);
        if (statsDoc.exists()) {
          await updateDoc(statsRef, { emailsSent: increment(selectedLeads.length) });
        } else {
          await setDoc(statsRef, { emailsSent: selectedLeads.length });
        }
      }
      
      clearSelection();
    } catch (err) {
      console.error('Error al enviar campaña:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido al enviar campaña');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-red-500" />
            Campañas Inteligentes
          </h2>
          <p className="text-gray-500 text-sm">Envía correos personalizados desde tu cuenta de Zoho</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              activeFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            Todo con Email ({leadsWithEmail.length})
          </button>
          <button 
            onClick={() => setActiveFilter('with-web')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              activeFilter === 'with-web' ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Email + Web ({leadsWithEmail.filter(l => !!l.website?.trim()).length})
          </button>
          <button 
            onClick={() => setActiveFilter('no-web')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              activeFilter === 'no-web' ? 'bg-red-50 border-red-200 text-red-600 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Email Sin Web ({leadsWithEmail.filter(l => !l.website?.trim()).length})
          </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-red-700 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Error de Configuración SMTP</p>
            <p className="text-xs opacity-80 mt-1">{error}</p>
            <p className="text-xs mt-2 font-medium">
              Por favor, verifica en <span className="font-bold underline">Settings</span> tus credenciales: EMAIL_USER, EMAIL_PASS (App Password si es Gmail), EMAIL_HOST y EMAIL_PORT.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selección de Plantilla */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              1. Elige tu Plantilla
            </h3>
            <button 
              onClick={() => openAIGenerator()}
              className="text-xs flex items-center gap-1 bg-black text-white px-2 py-1 rounded-md hover:bg-gray-800 transition-colors"
            >
              <Bot className="w-3 h-3" /> Añadir con IA
            </button>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {templates.map(template => (
              <div 
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative group ${
                  selectedTemplate?.id === template.id 
                  ? 'border-black bg-gray-50' 
                  : 'border-transparent bg-white shadow-sm hover:border-gray-200'
                }`}
              >
                <div className="font-bold text-gray-900 pr-12">{template.name}</div>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                    className="text-xs flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800"
                  >
                    <Eye className="w-3 h-3" /> Previsualizar
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openAIGenerator(template); }}
                    className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:text-purple-800"
                  >
                    <Edit3 className="w-3 h-3" /> Editar con IA
                  </button>
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template); }}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Eliminar plantilla"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center p-8 text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                No hay plantillas guardadas. Crea una con IA.
              </div>
            )}
          </div>
        </div>

        {/* Selección de Leads */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              2. Selecciona Destinatarios ({selectedLeads.length})
            </h3>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Todos</button>
              <button onClick={clearSelection} className="text-xs text-gray-500 hover:underline">Limpiar</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 w-10">Select</th>
                  <th className="px-4 py-3">Nombre / Negocio</th>
                  <th className="px-4 py-3">Email / Notas</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedLeads.includes(lead.id) ? 'bg-red-50/30' : ''
                    }`}
                    onClick={() => toggleLeadSelection(lead.id)}
                  >
                    <td className="px-4 py-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedLeads.includes(lead.id) ? 'bg-black border-black' : 'border-gray-300'
                      }`}>
                        {selectedLeads.includes(lead.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      {lead.website && <div className="text-[10px] text-blue-500 font-mono truncate max-w-[150px]">{lead.website}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-600 font-mono text-xs">{lead.email}</div>
                      {lead.notes ? (
                        <div className="text-[10px] text-purple-600 italic mt-1 line-clamp-1 max-w-[200px]" title={lead.notes}>
                          AI: {lead.notes}
                        </div>
                      ) : (
                        <div className="text-[10px] text-gray-300 italic mt-1">Sin notas IA</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {!lead.website ? (
                          <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">SIN WEB</span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">CON WEB</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No hay leads que coincidan con el filtro</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSendCampaign}
            disabled={selectedLeads.length === 0 || isSending || !selectedTemplate}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              selectedLeads.length > 0 && !isSending && selectedTemplate
              ? 'bg-black text-white hover:bg-gray-800 shadow-lg' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <>Enviando Campaña...</>
            ) : (
                <>
                <Send className="w-5 h-5" />
                Lanzar "{selectedTemplate?.name || 'Plantilla'}" a {selectedLeads.length} Leads
                </>
            )}
          </button>
        </div>
      </div>

      {/* Registro de Actividad */}
      {logs.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Historial Reciente</h3>
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={i} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono">{log.timestamp}</span>
                  <span className="font-medium">{log.template}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{log.count} enviados</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Previsualización */}
      <AnimatePresence>
        {showPreview && selectedTemplate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h4 className="font-bold">Vista Previa: {selectedTemplate.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Asunto: {selectedTemplate.subject}</p>
                </div>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-black">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-200">
                <iframe 
                  title="email-preview"
                  sandbox="allow-same-origin"
                  className="w-full h-full bg-white mx-auto border-0" 
                  srcDoc={selectedTemplate.html
                    .replace(/\{\{name\}\}/g, 'Cliente Ejemplo')
                    .replace(/\{\{business\}\}/g, 'Negocio Ejemplo')
                    .replace(/\{\{notes\}\}/g, 'Estas son las notas generadas por la IA sobre tu negocio para personalizar el trato.')
                  } 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal del Agente IA */}
      <AnimatePresence>
        {showAIDialog && !isAIMinimized && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsAIMinimized(true)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <h4 className="font-bold">{templateToEdit ? 'Editar Plantilla con IA' : 'Generar Plantilla con IA'}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsAIMinimized(true)} className="text-white/80 hover:text-white pb-2" title="Minimizar">_</button>
                  <button onClick={() => setShowAIDialog(false)} className="text-white/80 hover:text-white" title="Cerrar">✕</button>
                </div>
              </div>
              
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Interno de la Plantilla</label>
                  <input 
                    type="text" 
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    placeholder="Ej. Promoción Web Octubre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Asunto del Correo</label>
                  <input 
                    type="text" 
                    value={newTemplateSubject}
                    onChange={e => setNewTemplateSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                    placeholder="Ej. ¿Te interesa tener tu menú online?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Instrucciones para la IA</label>
                  <textarea 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm min-h-[100px] resize-y"
                    placeholder={templateToEdit ? "Ej. Cambia el color principal a rojo y añade un bloque ofreciendo 20% de descuento..." : "Ej. Escribe un correo invitando a bares a modernizarse con una app de pedidos móviles. Que sea amigable y corto..."}
                  />
                </div>
                
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
                  <div className="shrink-0 mt-0.5">ℹ️</div>
                  <p>La IA escribirá el código HTML diseñado para email. Asegúrate de pedir que use un tono adecuado y mencione si quieres enlaces específicos.</p>
                </div>
              </div>
              
              <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                <button 
                  onClick={() => setShowAIDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt.trim() || !newTemplateName.trim() || !newTemplateSubject.trim()}
                  className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Bot className="w-4 h-4" />
                  Pedir a IA
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget minimizado de IA */}
      <AnimatePresence>
        {showAIDialog && isAIMinimized && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-white border border-gray-200 shadow-2xl rounded-xl flex items-center gap-3 p-3 z-[100] cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsAIMinimized(false)}
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-full flex-shrink-0 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <div className="pr-2">
              <p className="font-bold text-gray-900 text-sm">{templateToEdit ? 'Editando...' : 'Nueva Plantilla'}</p>
              <p className="text-xs text-gray-500">Clic para reabrir</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowAIDialog(false); setIsAIMinimized(false); }}
              className="p-1 text-gray-400 hover:text-gray-800 rounded-md ml-auto"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast de carga de IA */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 bg-white border border-gray-100 shadow-2xl rounded-2xl flex items-center gap-4 p-4 z-[100] md:min-w-[300px]"
          >
            <div className="bg-purple-100 p-3 rounded-full flex-shrink-0 animate-pulse">
              <Bot className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">IA Trabajando</p>
              <p className="text-xs text-gray-500 mt-0.5">Escribiendo y diseñando tu HTML...</p>
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmación de Borrado */}
      <AnimatePresence>
        {templateToDelete && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setTemplateToDelete(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg text-gray-900 mb-2">Eliminar Plantilla</h3>
              <p className="text-sm text-gray-600 mb-6">
                ¿Estás seguro de que deseas eliminar la plantilla "{templateToDelete.name}"? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setTemplateToDelete(null)}
                  className="px-4 py-2 font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmDeleteTemplate()}
                  className="px-4 py-2 font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors text-sm"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
