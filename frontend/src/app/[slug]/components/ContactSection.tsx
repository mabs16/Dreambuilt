'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MessageCircle } from 'lucide-react';

interface ContactSectionProps {
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

export default function ContactSection({ config }: ContactSectionProps) {
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
              className="group flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <Phone size={24} />
              </div>
              <span className="text-gray-400 text-sm uppercase tracking-widest mb-2">Teléfono</span>
              <span className="text-white text-lg font-light">{config.phone}</span>
            </motion.a>
          )}

          {config.email && (
            <motion.a
              href={`mailto:${config.email}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
              <span className="text-gray-400 text-sm uppercase tracking-widest mb-2">Email</span>
              <span className="text-white text-lg font-light">{config.email}</span>
            </motion.a>
          )}

          {config.whatsapp && (
            <motion.a
              href={`https://wa.me/${config.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group flex flex-col items-center p-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle size={24} />
              </div>
              <span className="text-gray-400 text-sm uppercase tracking-widest mb-2">WhatsApp</span>
              <span className="text-white text-lg font-light">{config.whatsapp}</span>
            </motion.a>
          )}
        </div>
      </div>
    </section>
  );
}
