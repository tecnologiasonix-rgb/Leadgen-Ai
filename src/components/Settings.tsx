import React, { useState, useEffect } from 'react';
import { Save, Server, Loader2, Check } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';

interface SettingsProps {
  user: any;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [emailUser, setEmailUser] = useState('');
  const [pass, setPass] = useState('');
  const [fromName, setFromName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.uid) return;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const settings = userDoc.data()?.smtpSettings;
        if (settings) {
          setHost(settings.host || '');
          setPort(settings.port || '');
          setEmailUser(settings.user || '');
          setPass(settings.pass || '');
          setFromName(settings.fromName || '');
        }
      }
    };
    fetchSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsLoading(true);
    setIsSaved(false);

    try {
      await setDoc(doc(db, 'users', user.uid), {
        smtpSettings: {
          host,
          port,
          user: emailUser,
          pass,
          fromName
        }
      }, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuración</h2>
        <p className="text-sm text-slate-500">Configura tus credenciales SMTP para enviar correos desde tu propia cuenta.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Servidor SMTP</h3>
            <p className="text-xs text-slate-500">Si lo dejas en blanco, se usarán los valores globales.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Host SMTP</label>
              <input 
                type="text" 
                placeholder="Ej. smtp.gmail.com" 
                value={host} 
                onChange={(e) => setHost(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Puerto</label>
              <input 
                type="text" 
                placeholder="Ej. 465 o 587" 
                value={port} 
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico (Usuario)</label>
            <input 
              type="email" 
              placeholder="tu@correo.com" 
              value={emailUser} 
              onChange={(e) => setEmailUser(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Contraseña (o App Password)</label>
            <input 
              type="password" 
              placeholder="••••••••••••" 
              value={pass} 
              onChange={(e) => setPass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Remitente</label>
            <input 
              type="text" 
              placeholder="Tu Nombre o Empresa" 
              value={fromName} 
              onChange={(e) => setFromName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                </>
              ) : isSaved ? (
                <>
                  <Check className="w-5 h-5" /> ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Guardar Configuración
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
