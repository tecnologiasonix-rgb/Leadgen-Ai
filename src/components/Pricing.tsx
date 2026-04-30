import React from 'react';
import { Check, Star, Zap, Building2, ExternalLink } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface PricingProps {
  user: FirebaseUser | null;
}

export const Pricing: React.FC<PricingProps> = ({ user }) => {
  const handleSubscribe = (url: string) => {
    if (!url) {
      alert('Configura los links de Stripe en las variables de entorno primero.');
      return;
    }
    // Si tenemos usuario, podemos pasar su email o ID en la URL del link de pago
    const userParam = user?.email ? `?prefilled_email=${encodeURIComponent(user.email)}&client_reference_id=${user.uid}` : '';
    window.open(`${url}${userParam}`, '_blank');
  };

  const basicLink = (import.meta as any).env.VITE_STRIPE_BASIC_LINK || '';
  const proLink = (import.meta as any).env.VITE_STRIPE_PRO_LINK || '';
  const agencyLink = (import.meta as any).env.VITE_STRIPE_AGENCY_LINK || '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Planes y Precios</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
          Escala tus ventas con LeadGen AI. Elige el plan que mejor se adapte al tamaño de tu negocio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Startup / Basic Plan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col relative">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
            <Star className="text-blue-600 w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Startup</h3>
          <p className="text-slate-500 text-sm font-medium h-10">Ideal para freelancers y negocios pequeños que empiezan a prospectar.</p>
          <div className="my-6">
            <span className="text-4xl font-black text-slate-900">49€</span>
            <span className="text-slate-400 font-bold">/mes</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            {['Hasta 500 leads/mes', 'Búsqueda geográfica básica', 'Agente IA (limitado)', 'Gestor de leads', 'Soporte estándar'].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSubscribe(basicLink)}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Suscribirse a Startup <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-slate-900 rounded-3xl border border-indigo-500 p-8 shadow-2xl shadow-indigo-900/20 flex flex-col relative scale-100 md:scale-105 z-10">
          <div className="absolute -top-4 inset-x-0 mx-auto w-fit px-4 py-1 rounded-full bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/30">
            Más Elegido
          </div>
          <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30">
            <Zap className="text-indigo-400 w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white mb-2">Pro</h3>
          <p className="text-slate-400 text-sm font-medium h-10">Para equipos de ventas y agencias con alto volumen de prospección.</p>
          <div className="my-6">
            <span className="text-4xl font-black text-white">129€</span>
            <span className="text-slate-400 font-bold">/mes</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            {[
              'Hasta 5.000 leads/mes', 
              'Búsqueda avanzada sin límites', 
              'Agente IA evaluador (Ilimitado)', 
              'Campañas de E-mail integradas',
              'Campañas de Llamadas', 
              'Soporte prioritario 24/7'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSubscribe(proLink)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2"
          >
            Obtener Pro <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col relative">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
            <Building2 className="text-slate-600 w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Enterprise</h3>
          <p className="text-slate-500 text-sm font-medium h-10">Para grandes empresas que requieren soluciones a medida.</p>
          <div className="my-6">
            <span className="text-4xl font-black text-slate-900">299€</span>
            <span className="text-slate-400 font-bold">/mes</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            {[
              'Leads Ilimitados', 
              'Múltiples cuentas de usuario', 
              'Asignación automática de comerciales',
              'Integración API con tu CRM', 
              'Desarrollo de IA personalizada', 
              'Account Manager dedicado'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-700 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSubscribe(agencyLink)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Contactar Ventas <ExternalLink className="w-4 h-4" />
          </button>
        </div>

      </div>

      <div className="mt-16 bg-blue-50 border border-blue-100 rounded-3xl p-8 max-w-4xl mx-auto shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h4 className="text-xl font-black text-slate-900">Pagos Seguros a través de Stripe</h4>
          <p className="text-slate-600 font-medium text-sm">
            Toda la facturación es gestionada de forma segura por Stripe. Cancela, pausa o cambia tu plan en cualquier momento desde tu panel de facturación.
          </p>
        </div>
        <div className="flex-shrink-0">
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8 opacity-60 grayscale hover:grayscale-0 transition-all" />
        </div>
      </div>
    </div>
  );
};
