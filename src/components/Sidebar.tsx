import React from 'react';
import { Database, Search, ListFilter, Send, LogOut, User, Phone, LayoutDashboard, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { View } from '../types';
import { auth } from '../lib/firebase';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  user: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, user }) => {
  const menuItems = [
    { id: 'dashboard' as View, label: 'Panel', desktopLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'finder' as View, label: 'Buscar', desktopLabel: 'Lead Finder', icon: Search },
    { id: 'manager' as View, label: 'Leads', desktopLabel: 'Lead Manager', icon: ListFilter },
    { id: 'campaigns' as View, label: 'Emails', desktopLabel: 'Campañas Email', icon: Send },
    { id: 'calls' as View, label: 'Llamadas', desktopLabel: 'Campañas Llamadas', icon: Phone },
    { id: 'settings' as View, label: 'Ajustes', desktopLabel: 'Configuración', icon: SettingsIcon },
    { id: 'billing' as View, label: 'Planes', desktopLabel: 'Planes y Precios', icon: CreditCard },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 h-16 z-50 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="text-white w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-white text-lg tracking-tight leading-tight">LeadGen <span className="text-indigo-400">AI</span></span>
            <a href="https://tecnologiasonix.com" target="_blank" rel="noopener noreferrer" className="text-[9px] text-slate-500 hover:text-indigo-400 font-medium transition-colors leading-[0.5]">by Tecnologías Onix</a>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 overflow-hidden">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
          <button onClick={() => auth.signOut()} className="text-slate-400 hover:text-white p-1">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Bottom Nav */}
      <aside className="fixed bottom-0 md:top-0 left-0 w-full md:w-64 h-[72px] md:h-screen bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 text-slate-300 flex md:flex-col z-50 pb-safe">
        
        {/* Desktop Branding */}
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Database className="text-white w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-white text-xl tracking-tight block leading-tight">LeadGen <span className="text-indigo-400">AI</span></span>
            <a href="https://tecnologiasonix.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-indigo-400 font-medium transition-colors">by Tecnologías Onix</a>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex md:flex-col px-2 md:p-4 gap-1 md:gap-2 justify-between md:justify-start items-center md:items-stretch overflow-x-auto md:overflow-visible no-scrollbar h-full md:h-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center md:justify-start px-1 md:px-4 py-2 md:py-3 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'text-indigo-400 md:bg-indigo-600 md:text-white md:shadow-lg md:shadow-indigo-600/20' 
                  : 'hover:bg-white/5 text-slate-400 md:hover:text-white'
              }`}
            >
              <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 w-full justify-center md:justify-start">
                <item.icon className="w-6 h-6 md:w-5 md:h-5 mt-1 md:mt-0" />
                <span className="font-bold text-[10px] md:text-sm mt-0.5 md:mt-0">
                  <span className="md:hidden">{item.label}</span>
                  <span className="hidden md:inline">{item.desktopLabel}</span>
                </span>
              </div>
            </button>
          ))}
        </nav>

        {/* Desktop User Footer */}
        <div className="hidden md:block p-4 border-t border-white/10 bg-black/20 mt-auto">
          <div className="flex items-center gap-3 px-2 py-3 bg-white/5 rounded-xl border border-white/5 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.displayName || 'Usuario'}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-xs font-bold"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
};
