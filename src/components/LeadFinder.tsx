import React, { useState, useMemo } from 'react';
import { Search, MapPin, Loader2, Download, Filter, Database, CheckSquare, Square, Copy, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { LeadService } from '../services/LeadService';
import { Lead } from '../types';

interface LeadFinderProps {
  leadService: LeadService;
  user: any;
  zipCode: string;
  setZipCode: (v: string) => void;
  businessType: string;
  setBusinessType: (v: string) => void;
  leads: Lead[];
  setLeads: (l: Lead[]) => void;
  selectedLeads: number[];
  setSelectedLeads: (i: number[] | ((prev: number[]) => number[])) => void;
}

export const LeadFinder: React.FC<LeadFinderProps> = ({ 
  leadService, 
  user,
  zipCode, setZipCode,
  businessType, setBusinessType,
  leads, setLeads,
  selectedLeads, setSelectedLeads
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = leads.length;
    const withEmail = leads.filter(l => !!l.email).length;
    const perc = total > 0 ? Math.round((withEmail / total) * 100) : 0;
    return { total, withEmail, perc };
  }, [leads]);

  const [isNicheOpen, setIsNicheOpen] = useState(false);

  const NICHES = [
    'Abogados', 'Academias de Baile', 'Academias de Idiomas', 'Academias de Música', 
    'Administradores de Fincas', 'Agencias de Viajes', 'Alquiler de Coches', 'Antenistas', 
    'Arquitectos', 'Auditorías', 'Autoescuelas', 'Bares y Restaurantes', 'Bazares', 
    'Bibliotecas', 'Cafeterías', 'Carpinterías', 'Carnicerías', 'Centros de Coworking', 
    'Centros de Día', 'Centros de Yoga', 'Cerrajeros', 'Churrerías', 'Cines', 
    'Clínicas de Estética', 'Clínicas Veterinarias', 'Colegios', 'Concesionarios', 
    'Consultorías', 'Cristalerías', 'Dentistas', 'Desguaces', 'Despachos de Pan', 
    'Discotecas', 'Diseñadores Gráficos', 'Electricistas', 'Estancos', 'Estudios de Tatuaje', 
    'Eventos y Catering', 'Farmacias', 'Ferreterías', 'Fisioterapeutas', 'Floristerías', 
    'Fontaneros', 'Fotógrafos', 'Fruterías', 'Funerarias', 'Gasolineras', 'Gestorías', 
    'Gimnasios', 'Grúas', 'Guarderías', 'Herbolarios', 'Hoteles', 'Informática y Reparación', 
    'Inmobiliarias', 'Institutos', 'Jardinería', 'Joyerías', 'Jugueterías', 'Kioscos', 
    'Lavanderías', 'Librerías y Papelerías', 'Limpiezas', 'Logopedas', 'Marmolistas', 
    'Mercados', 'Mudanzas', 'Museos', 'Notarías', 'Nutricionistas', 'Ópticas', 
    'Osteópatas', 'Panaderías', 'Parques Infantiles', 'Pastelerías', 'Pavimentos', 
    'Peluquerías', 'Perfumerías', 'Pescaderías', 'Pintores', 'Piscinas (Mantenimiento)', 
    'Podólogos', 'Polideportivos', 'Psicólogos', 'Psicopedagogos', 'Pubs', 'Recambios', 
    'Reformas y Construcción', 'Residencias de Ancianos', 'Residencias Caninas', 
    'Restauración de Muebles', 'Salones de Juego', 'Seguros', 'Serigrafía', 
    'Servicios Agrícolas', 'Supermercados y Alimentación', 'Talleres Mecánicos', 
    'Taxis', 'Teatros', 'Tiendas de Animales', 'Tiendas de Bicicletas', 'Tiendas de Deportes', 
    'Tiendas de Electrónica', 'Tiendas de Muebles', 'Tiendas de Ropa', 'Tintorerías', 
    'Trasteros', 'Turismo Rural', 'Veterinarios', 'Viveros', 'Zapaterías'
  ];

  const filteredNiches = useMemo(() => {
    return NICHES.filter(n => n.toLowerCase().includes(businessType.toLowerCase()));
  }, [businessType]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipCode.trim() || !businessType.trim()) return;
    setIsLoading(true);
    setError(null);
    setSelectedLeads([]);
    try {
      const zipList = zipCode.split(/[, ]+/).filter(z => z.length >= 3);
      const results = await leadService.searchLeads(zipList, businessType);
      setLeads(results);
    } catch (err) {
      setError('Error al buscar leads.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSelectedLeads = async () => {
    if (selectedLeads.length === 0) return;
    setIsSaving(true);
    try {
      const { UserService } = await import('../services/UserService');
      const subscription = await UserService.getUserSubscription(user.uid);
      
      const newTotalLeads = subscription.leadsUsed + selectedLeads.length;
      if (subscription.plan !== 'enterprise' && newTotalLeads > subscription.leadsLimit) {
        toast.error(`Límite de tu plan alcanzado (máx ${subscription.leadsLimit} leads). Mejora tu plan para guardar más.`);
        setIsSaving(false);
        return;
      }
      
      for (const idx of selectedLeads) {
        await leadService.saveToFirestore(leads[idx], user.uid);
      }
      
      await UserService.incrementLeadsUsed(user.uid, selectedLeads.length);
      
      toast.success('Leads guardados correctamente en el Lead Manager');
      setSelectedLeads([]);
    } catch (err) {
      toast.error('Error al guardar leads');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Zona Geográfica (CP)</label>
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium text-slate-900"
              placeholder="Ej: 08001, 28001..."
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">¿Qué buscas? (Nicho)</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-5 h-5 z-10" />
            <input
              type="text"
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-500 transition-all outline-none font-medium text-slate-900"
              placeholder="Selecciona o escribe un nicho..."
              value={businessType}
              onFocus={() => setIsNicheOpen(true)}
              onBlur={() => setTimeout(() => setIsNicheOpen(false), 200)}
              onChange={(e) => setBusinessType(e.target.value)}
            />
            
            <AnimatePresence>
              {isNicheOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-2"
                >
                  {filteredNiches.length > 0 ? (
                    filteredNiches.map(niche => (
                      <button
                        key={niche}
                        onClick={() => {
                          setBusinessType(niche);
                          setIsNicheOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                      >
                        {niche}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-xs text-slate-400 font-bold uppercase italic">
                      Pulsa "Enter" para buscar "{businessType}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !zipCode}
          className="md:mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Explorar <Search className="w-5 h-5" /></>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl border border-slate-200 p-20 text-center space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">IA trabajando en tiempo real...</h2>
              <p className="text-slate-500">Extrayendo emails y datos de contacto de la zona {zipCode}</p>
            </div>
          </motion.div>
        ) : leads.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl text-white">
              <div className="flex items-center gap-6 px-4">
                <div className="text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encontrados</div>
                  <div className="text-lg font-bold">{stats.total}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Con Email</div>
                  <div className="text-lg font-bold text-indigo-400">{stats.withEmail}</div>
                </div>
              </div>
              <button
                onClick={saveSelectedLeads}
                disabled={selectedLeads.length === 0 || isSaving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar en Manager ({selectedLeads.length})
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
               <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th 
                      className="px-6 py-4 w-12 cursor-pointer group"
                      onClick={() => {
                        if (selectedLeads.length === leads.length) {
                          setSelectedLeads([]);
                        } else {
                          setSelectedLeads(leads.map((_, i) => i));
                        }
                      }}
                    >
                      <div className="flex items-center justify-center">
                        {selectedLeads.length === leads.length && leads.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Establecimiento</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Contactos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedLeads(p => p.includes(idx) ? p.filter(i => i !== idx) : [...p, idx])}
                      className={`cursor-pointer transition-colors ${selectedLeads.includes(idx) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4">
                        {selectedLeads.includes(idx) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300" />}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-400">{lead.address}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                           {lead.email && <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded border border-blue-100">{lead.email}</span>}
                           {lead.phone && <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100">{lead.phone}</span>}
                           {!lead.email && !lead.phone && <span className="text-[10px] text-slate-300 font-bold italic">Sin contacto</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>
          </motion.div>
        ) : (
          <div className="bg-white rounded-[40px] border-4 border-dashed border-slate-100 p-24 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto">
              <Search className="text-slate-200 w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">Buscador de Nichos IA</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Escribe un código postal y el tipo de negocio para empezar a capturar leads.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
