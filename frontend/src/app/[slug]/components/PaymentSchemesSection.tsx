'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface PaymentScheme {
  id: string;
  down_payment: string;
  construction_payment: string;
  delivery_payment: string;
  discount: string;
}

interface PaymentSchemesSectionProps {
  config: {
    enabled: boolean;
    decorative_title?: string;
    title?: string;
    subtitle?: string;
    footer_title?: string;
    footer_text?: string;
    schemes: PaymentScheme[];
  };
}

export default function PaymentSchemesSection({ config }: PaymentSchemesSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [config.schemes]);

  if (!config.enabled) return null;

  const ease = [0.215, 0.61, 0.355, 1] as const;

  return (
    <section className="relative w-full bg-black py-20 md:py-32 px-4 overflow-hidden">
      {/* Background Texture Effect - Optional subtle grain or texture could be added here */}
      <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>

      <div className="container mx-auto max-w-5xl relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          {config.decorative_title && (
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease }}
              className="text-amber-500 font-monsieur text-4xl md:text-5xl tracking-widest block mb-4"
            >
              {config.decorative_title}
            </motion.span>
          )}
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease }}
            className="text-4xl md:text-6xl font-cormorant font-light text-white uppercase tracking-wide mb-6"
          >
            {config.title || 'Esquemas de Pago'}
          </motion.h2>
          {config.subtitle && (
             <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6, ease }}
                className="text-gray-400 italic font-light text-sm md:text-base"
             >
                {config.subtitle}
             </motion.p>
          )}
        </div>

        {/* Table Container */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.8, ease }}
            className="bg-zinc-900/30 border border-white/20 rounded-2xl p-2 md:p-8 backdrop-blur-sm shadow-2xl overflow-hidden"
        >
            <div className="relative">
                {/* Mobile Scroll Indicators */}
                <div className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none md:hidden flex items-center justify-start transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`}>
                     <ChevronLeft className="w-6 h-6 text-amber-500/70 animate-pulse" />
                </div>
                
                <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none md:hidden flex items-center justify-end transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`}>
                     <ChevronRight className="w-6 h-6 text-amber-500/70 animate-pulse" />
                </div>

                <div 
                    className="overflow-x-auto"
                    ref={scrollContainerRef}
                    onScroll={checkScroll}
                >
                    <table className="w-full text-center border-collapse min-w-[600px]">
                    <thead>
                        <tr>
                            <th className="py-6 px-4 text-white font-cormorant text-xs md:text-2xl uppercase tracking-wider border-b border-white/10 w-1/4">Enganche</th>
                            <th className="py-6 px-4 text-white font-cormorant text-xs md:text-2xl uppercase tracking-wider border-b border-white/10 w-1/4">Pagos Durante Obra</th>
                            <th className="py-6 px-4 text-white font-cormorant text-xs md:text-2xl uppercase tracking-wider border-b border-white/10 w-1/4">Entrega</th>
                            <th className="py-6 px-4 text-white font-cormorant text-xs md:text-2xl uppercase tracking-wider border-b border-white/10 w-1/4">Descuento</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {config.schemes?.map((scheme, index) => (
                            <tr key={scheme.id || index} className="group hover:bg-white/5 transition-colors duration-300">
                                <td className="py-6 px-4 text-gray-300 font-light text-lg md:text-xl">{scheme.down_payment}</td>
                                <td className="py-6 px-4 text-gray-300 font-light text-lg md:text-xl">{scheme.construction_payment}</td>
                                <td className="py-6 px-4 text-gray-300 font-light text-lg md:text-xl">{scheme.delivery_payment}</td>
                                <td className="py-6 px-4 text-amber-500 font-medium text-lg md:text-xl">{scheme.discount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-16 space-y-4">
            {config.footer_title && (
                <motion.h3 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl md:text-3xl font-cormorant text-white uppercase tracking-widest"
                >
                    {config.footer_title}
                </motion.h3>
            )}
            {config.footer_text && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-500 font-light text-sm italic max-w-3xl mx-auto leading-relaxed whitespace-pre-wrap"
                >
                    {config.footer_text}
                </motion.p>
            )}
        </div>

      </div>
    </section>
  );
}
