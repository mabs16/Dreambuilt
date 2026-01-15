'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle } from 'lucide-react';

interface ContactSectionProps {
  propertyName?: string;
  config: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    call_to_action_text?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
}

export default function ContactSection({ config, propertyName }: ContactSectionProps) {
  if (!config) return null;

  return (
    <section className="relative w-full bg-black py-20 md:py-32 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5 pointer-events-none"></div>
      
      <div className="container mx-auto max-w-4xl relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <span className="text-amber-500 font-monsieur text-4xl md:text-5xl tracking-widest block mb-4">
            Contacto
          </span>
          <h2 className="text-3xl md:text-5xl font-cormorant font-light text-white uppercase tracking-wide">
            {config.call_to_action_text || 'Hablemos de tu Inversión'}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {config.phone && (
            <motion.a
              href={`tel:${config.phone}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group flex flex-col items-center p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-amber-500/10">
                <Phone size={28} />
              </div>
              <span className="relative z-10 text-amber-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">Llamada</span>
              <span className="relative z-10 text-white text-lg font-light tracking-wide group-hover:text-amber-200 transition-colors">{config.phone}</span>
            </motion.a>
          )}

          {config.whatsapp && (
            <motion.a
              href={`https://wa.me/${(() => {
                const clean = config.whatsapp.replace(/[^0-9]/g, '');
                // Si tiene 10 dígitos exactos, asumimos que es un número de México y le agregamos el prefijo 52
                const phone = clean.length === 10 ? `52${clean}` : clean;
                
                const message = propertyName 
                  ? `Hola, estoy interesado en ${propertyName} y me gustaría recibir más información.`
                  : 'Hola, me gustaría recibir más información.';
                  
                return `${phone}?text=${encodeURIComponent(message)}`;
              })()}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group flex flex-col items-center p-10 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-emerald-500/10">
                <MessageCircle size={28} />
              </div>
              <span className="relative z-10 text-emerald-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">WhatsApp</span>
              <span className="relative z-10 text-white text-lg font-light tracking-wide group-hover:text-emerald-200 transition-colors">{config.whatsapp}</span>
            </motion.a>
          )}

          {config.email && (
            <motion.a
              href={`mailto:${config.email}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group flex flex-col items-center p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-blue-500/10">
                <Mail size={28} />
              </div>
              <span className="relative z-10 text-blue-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">Email</span>
              <span className="relative z-10 text-white text-sm md:text-base font-light tracking-wide text-center group-hover:text-blue-200 transition-colors px-2">{config.email}</span>
            </motion.a>
          )}
        </div>
      </div>
    </section>
  );
}
