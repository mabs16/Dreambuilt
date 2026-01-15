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
  if (!config.enabled) return null;

  const hasContent = config.tour_embed || (config.videos && config.videos.length > 0);
  if (!hasContent) return null;

  // Determinar orientación del primer video (por defecto portrait si no se especifica, para mantener el comportamiento actual)
  const mainVideo = config.videos && config.videos[0];
  const isLandscape = mainVideo?.orientation === 'landscape';

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

            {/* List of videos if more than 1, or titles */}
            {config.videos && config.videos.length > 1 && (
                <div className="space-y-2">
                    <h3 className="text-amber-500 font-medium uppercase tracking-widest text-sm mb-4">Galería de Videos</h3>
                    <div className="flex flex-wrap gap-2">
                        {config.videos.map((video, idx) => (
                            <div key={video.id || idx} className="text-sm text-gray-400 flex items-center">
                                <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                                {video.title || `Video ${idx + 1}`}
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>

          {/* Right Column: Media (Video/Tour) */}
          <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 order-1 lg:order-2 bg-gray-900 group ${isLandscape ? 'aspect-video' : 'h-[500px] lg:h-[700px]'}`}>
            {config.tour_embed ? (
                 <div 
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                    dangerouslySetInnerHTML={{ __html: config.tour_embed }} 
                />
            ) : mainVideo ? (
                // Lógica condicional según orientación
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                    {isLandscape ? (
                        // LANDSCAPE: Priorizamos ancho para cubrir (técnica Hero desktop)
                         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.77vh] aspect-video">
                            <iframe 
                                src={`${mainVideo.url}${mainVideo.url.includes('?') ? '&' : '?'}autoplay=0&loop=1&muted=0&controls=1`}
                                className="w-full h-full pointer-events-auto"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                                allowFullScreen
                                title={mainVideo.title || "Virtual Tour Video"}
                            />
                        </div>
                    ) : (
                        // PORTRAIT: Priorizamos altura para cubrir (técnica actual)
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 min-w-[100%] min-h-[100%] w-auto h-[177.77vw] aspect-video">
                            <iframe 
                                src={`${mainVideo.url}${mainVideo.url.includes('?') ? '&' : '?'}autoplay=0&loop=1&muted=0&controls=1`}
                                className="w-full h-full pointer-events-auto"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" 
                                allowFullScreen
                                title={mainVideo.title || "Virtual Tour Video"}
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
