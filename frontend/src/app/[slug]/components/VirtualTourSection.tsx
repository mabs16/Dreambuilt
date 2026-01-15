'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualTourSectionProps {
  config: {
    enabled: boolean;
    decorative_title?: string;
    title?: string;
    description?: string;
    tour_embed?: string;
    videos?: {
      id: string;
      url: string;
      thumbnail_url?: string;
      title?: string;
      orientation?: 'landscape' | 'portrait';
    }[];
  };
}

export default function VirtualTourSection({ config }: VirtualTourSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!config.enabled) return null;

  const hasContent = config.tour_embed || (config.videos && config.videos.length > 0);
  if (!hasContent) return null;

  // Obtener videos y el video actual
  const videos = config.videos || [];
  const currentVideo = videos.length > 0 ? videos[currentIndex] : null;
  const isLandscape = currentVideo?.orientation === 'landscape';

  const nextVideo = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const prevVideo = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  return (
    <section className="py-20 bg-black text-white relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Content */}
          <div className="space-y-8 order-2 lg:order-1">
            <div>
                {config.decorative_title && (
                    <span className="text-amber-500 font-monsieur text-5xl md:text-7xl block mb-4">
                        {config.decorative_title}
                    </span>
                )}
                {config.title && (
                    <h2 className="text-4xl md:text-6xl font-cormorant font-light text-white leading-tight uppercase">
                        {config.title}
                    </h2>
                )}
            </div>
            
            {config.description && (
                <p className="text-lg text-gray-300 leading-relaxed font-light whitespace-pre-wrap mb-8">
                    {config.description}
                </p>
            )}
          </div>

          {/* Right Column: Media (Video/Tour) */}
          <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 order-1 lg:order-2 bg-gray-900 group ${isLandscape ? 'aspect-video' : 'h-[500px] lg:h-[700px]'}`}>
            {/* Navigation Arrows Overlay */}
            {videos.length > 1 && !config.tour_embed && (
                <>
                    <button 
                        onClick={prevVideo}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white transition-all duration-300 border border-white/10 backdrop-blur-sm group pointer-events-auto"
                        aria-label="Video anterior"
                    >
                        <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                        onClick={nextVideo}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white transition-all duration-300 border border-white/10 backdrop-blur-sm group pointer-events-auto"
                        aria-label="Siguiente video"
                    >
                        <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                </>
            )}

            {config.tour_embed ? (
                 <div 
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                    dangerouslySetInnerHTML={{ __html: config.tour_embed }} 
                />
            ) : currentVideo ? (
                // Lógica condicional según orientación
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                    {isLandscape ? (
                        // LANDSCAPE: Priorizamos ancho para cubrir (técnica Hero desktop)
                         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.77vh] aspect-video">
                            <iframe 
                                key={currentVideo.id}
                                src={`${currentVideo.url}${currentVideo.url.includes('?') ? '&' : '?'}autoplay=0&loop=1&muted=0&controls=1`}
                                className="w-full h-full pointer-events-auto"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                                allowFullScreen
                                title={currentVideo.title || "Virtual Tour Video"}
                            />
                        </div>
                    ) : (
                        // PORTRAIT: Priorizamos altura para cubrir (técnica actual)
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[100%] min-h-[100%] w-auto h-[177.77vw] aspect-video">
                            <iframe 
                                key={currentVideo.id}
                                src={`${currentVideo.url}${currentVideo.url.includes('?') ? '&' : '?'}autoplay=0&loop=1&muted=0&controls=1`}
                                className="w-full h-full pointer-events-auto"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                                allowFullScreen
                                title={currentVideo.title || "Virtual Tour Video"}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                    Sin contenido multimedia
                </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
