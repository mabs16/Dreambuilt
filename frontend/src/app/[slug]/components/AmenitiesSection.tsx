'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Amenity {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  icon?: string;
}

interface AmenitiesSectionProps {
  amenities: Amenity[];
  config?: {
    decorative_title?: string;
    title?: string;
    description?: string;
  };
}

export default function AmenitiesSection({ amenities, config }: AmenitiesSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!amenities || amenities.length === 0) return null;

  const currentAmenity = amenities[currentIndex];

  const nextAmenity = () => {
    setCurrentIndex((prev) => (prev + 1) % amenities.length);
  };

  const prevAmenity = () => {
    setCurrentIndex((prev) => (prev - 1 + amenities.length) % amenities.length);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] as const }
    }
  };

  const contentVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { 
      opacity: 1, 
      x: 0, 
      transition: { duration: 0.5, ease: "easeOut" as const } 
    },
    exit: { 
      opacity: 0, 
      x: -20, 
      transition: { duration: 0.3, ease: "easeIn" as const } 
    }
  };

  return (
    <section className="relative h-screen w-full bg-black overflow-hidden">
      {/* Background Image Carousel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute top-0 left-0 w-full h-[65vh] md:h-full"
        >
          {currentAmenity.image_url ? (
            <Image
              src={currentAmenity.image_url}
              alt={currentAmenity.name}
              fill
              className="object-cover opacity-60"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <span className="text-white/20 text-4xl">Sin imagen</span>
            </div>
          )}
          {/* Dark Overlay Gradient - Desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent hidden md:block" />
          
          {/* Dark Overlay Gradient - Mobile (Bottom fade) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent md:hidden" />
        </motion.div>
      </AnimatePresence>

      {/* Content Container */}
      <motion.div 
        className="relative z-10 h-full container mx-auto px-4 flex flex-col justify-between py-12 md:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        
        {/* Section Header */}
        <motion.div variants={itemVariants} className="md:ml-12">
          <span className="text-amber-500 font-monsieur text-3xl md:text-4xl tracking-widest block mb-2">
            {config?.decorative_title || "Amazing Features"}
          </span>
          <h2 className="hidden md:block text-5xl md:text-7xl font-cormorant font-light text-white leading-none uppercase">
            {config?.title ? (
                <span dangerouslySetInnerHTML={{ __html: config.title.replace(/\n/g, '<br/>') }} />
            ) : (
                <>
                    Top-Level <br />
                    <span className="italic text-amber-500">Amenities</span>
                </>
            )}
          </h2>
          {config?.description && (
              <p className="text-gray-300 font-light leading-relaxed mt-4 max-w-lg">
                  {config.description}
              </p>
          )}
        </motion.div>

        <div className="flex flex-col md:flex-row items-end justify-between w-full">
          
          {/* Bottom Left: Description Box */}
          <div className="w-full md:w-auto md:ml-12 mb-8 md:mb-0">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentAmenity.id}
                    variants={contentVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl max-w-md w-full relative group"
                >
                    <h3 className="text-3xl md:text-4xl font-cormorant text-white mb-4">
                        {currentAmenity.name}
                    </h3>
                    <p className="text-gray-300 font-light leading-relaxed mb-6">
                        {currentAmenity.description || 'Disfruta de espacios diseñados exclusivamente para tu confort y estilo de vida.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-amber-500 text-sm tracking-widest uppercase">
                            Amenidad {currentIndex + 1} de {amenities.length}
                        </span>
                        <div className="flex gap-3">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevAmenity();
                                }}
                                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    nextAmenity();
                                }}
                                className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all duration-300"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </motion.div>
    </section>
  );
}
