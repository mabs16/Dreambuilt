'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, ChevronRight, ChevronLeft } from 'lucide-react';

interface Typology {
  id: string;
  name: string;
  description?: string;
  image_url: string;
}

interface FloorPlansSectionProps {
  typologies: Typology[];
  config?: {
    decorative_title?: string;
    title?: string;
    description?: string;
  };
}

export default function FloorPlansSection({ typologies, config }: FloorPlansSectionProps) {
  const [selectedId, setSelectedId] = useState<string>(typologies[0]?.id || '');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 10); // Threshold of 10px
      // Check if we are close to the end (within 10px)
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [typologies]);
  
  const selectedTypology = typologies.find(t => t.id === selectedId) || typologies[0];

  if (!typologies || typologies.length === 0) return null;

  return (
    <section className="py-24 bg-gray-950 text-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-right mb-16">
          {config?.decorative_title && (
            <span className="text-amber-500 font-monsieur text-2xl tracking-widest block mb-2">
              {config.decorative_title}
            </span>
          )}
          <h2 className="text-5xl md:text-6xl font-cormorant font-light uppercase tracking-wide">
            {config?.title || "PLANOS"}
          </h2>
          {config?.description && (
             <p className="mt-4 text-gray-400 font-light max-w-2xl ml-auto">
               {config.description}
             </p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start">
          {/* Sidebar / Navigation */}
          <div className="w-full lg:w-1/4 relative">
            {/* Mobile Scroll Indicators */}
            <div className={`absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-gray-950 via-gray-950/80 to-transparent z-10 pointer-events-none lg:hidden flex items-center justify-start pl-2 transition-opacity duration-300 ${showLeftArrow ? 'opacity-100' : 'opacity-0'}`}>
                 <ChevronLeft className="w-6 h-6 text-amber-500/70 animate-pulse" />
            </div>
            
            <div className={`absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-950 via-gray-950/80 to-transparent z-10 pointer-events-none lg:hidden flex items-center justify-end pr-2 transition-opacity duration-300 ${showRightArrow ? 'opacity-100' : 'opacity-0'}`}>
                 <ChevronRight className="w-6 h-6 text-amber-500/70 animate-pulse" />
            </div>

            <div 
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex flex-row lg:flex-col gap-4 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide pr-12 lg:pr-0"
            >
              {typologies.map((typo) => (
                <button
                  key={typo.id}
                  onClick={() => setSelectedId(typo.id)}
                  className={`group relative flex items-center justify-between px-6 py-4 transition-all duration-300 rounded-full border whitespace-nowrap flex-shrink-0 ${
                    selectedId === typo.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                      : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                  }`}
                >
                <span className={`text-lg font-medium tracking-wide ${selectedId === typo.id ? 'font-bold' : ''}`}>
                  {typo.name}
                </span>
                {selectedId === typo.id && (
                  <ArrowRight className="w-5 h-5 animate-pulse" />
                )}
              </button>
              ))}
            </div>
          </div>

          {/* Main Content / Image */}
          <div className="w-full lg:w-3/4">
             <div className="relative aspect-[16/9] w-full bg-gray-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8">
                {selectedTypology?.image_url ? (
                  <Image
                      src={selectedTypology.image_url}
                      alt={selectedTypology.name}
                      fill
                      className="object-cover"
                      priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-light">
                    Imagen no disponible
                  </div>
                )}
             </div>

             {/* Description Below Image */}
             {selectedTypology?.description && (
                <div className="px-4 md:px-0">
                   <p className="text-gray-400 font-light text-lg leading-relaxed">
                     {selectedTypology.description}
                   </p>
                </div>
             )}
          </div>
        </div>
      </div>
    </section>
  );
}
