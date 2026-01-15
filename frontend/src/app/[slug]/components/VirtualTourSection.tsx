'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Play, Pause } from 'lucide-react';
import Hls from 'hls.js';

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
  const [playing, setPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // Ref para mantener el estado de interacción incluso si hay re-renders inesperados
  const interactionRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const videos = config.videos || [];
  const currentVideo = videos.length > 0 ? videos[currentIndex] : null;
  const isLandscape = currentVideo?.orientation === 'landscape';
  const isBunny = currentVideo?.url.includes('iframe.mediadelivery.net');
  const hasContent = config.tour_embed || (config.videos && config.videos.length > 0);

  // Obtener URL limpia para el iframe de Bunny
  const getBunnyUrl = (url: string, forceAutoplay: boolean) => {
    if (!url) return '';
    let embedUrl = url;
    if (url.includes('/play/')) {
      embedUrl = url.replace('/play/', '/embed/');
    }
    const separator = embedUrl.includes('?') ? '&' : '?';
    // Si forceAutoplay es true, activamos autoplay y unmute para asegurar que arranque
    // Si es false, desactivamos autoplay para controlar nosotros
    const autoplayValue = forceAutoplay ? 'true' : 'false';
    const mutedValue = forceAutoplay ? 'false' : 'false'; // Intentamos con sonido activado si el usuario ya interactuó
    const preloadValue = forceAutoplay ? 'true' : 'false'; // Evitamos cargar recursos (y scripts de métricas) hasta que el usuario interactúe
    
    // Añadimos context=true para habilitar postMessage desde el inicio
    return `${embedUrl}${separator}autoplay=${autoplayValue}&muted=${mutedValue}&loop=false&controls=false&responsive=false&playsinline=true&preload=${preloadValue}&context=true`;
  };

  useEffect(() => {
    if (!currentVideo || config.tour_embed || isBunny || !config.enabled) return;

    const video = videoRef.current;
    if (!video) return;

    const url = currentVideo.url;

    // Limpiar HLS anterior
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && url.includes('m3u8')) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        autoStartLoad: true
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else {
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentIndex, currentVideo, config.tour_embed, isBunny, config.enabled]);

  // Escuchar eventos del player de Bunny
  useEffect(() => {
    if (!isBunny) return;

    const handleMessage = (event: MessageEvent) => {
      // Filtrar mensajes irrelevantes
      if (!event.data) return;
      
      // Intentar parsear el mensaje si es string JSON
      let data = event.data;
      if (typeof event.data === 'string') {
          try {
              // Bunny a veces envía strings simples o JSON strings
              if (event.data.startsWith('{')) {
                  data = JSON.parse(event.data);
              }
          } catch (e) {
              // Si no es JSON válido, lo tratamos como string normal
          }
      }

      // Si recibimos confirmación de pausa, nos aseguramos que el estado local esté sincronizado
      // Esto ayuda si el usuario pausó usando los controles nativos del iframe (si estuvieran visibles)
      // o para confirmar que nuestro comando funcionó.
      if (data && (data === 'paused' || data.event === 'paused' || data.type === 'paused')) {
          if (playing) setPlaying(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isBunny, playing]);

  // Sincronizar estado de playing con el video o iframe
  useEffect(() => {
    if (!config.enabled) return;

    const sendCommand = () => {
      if (isBunny) {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) return;
        
        try {
          const cmd = playing ? 'play' : 'pause';
          
          // Ultimate Shotgun Strategy: Disparar todos los formatos conocidos
          const payload1 = { method: cmd };
          const payload2 = { method: cmd, value: null };
          const payload3 = { context: 'player.js', method: cmd };
          
          // Enviar objetos directos (para navegadores/players modernos)
          iframe.contentWindow.postMessage(payload1, '*');
          iframe.contentWindow.postMessage(payload2, '*');
          iframe.contentWindow.postMessage(payload3, '*');

          // Enviar JSON strings (para players estrictos o antiguos)
          iframe.contentWindow.postMessage(JSON.stringify(payload1), '*');
          iframe.contentWindow.postMessage(JSON.stringify(payload2), '*');
          iframe.contentWindow.postMessage(JSON.stringify(payload3), '*');

          // Formatos Legacy / Alternativos
          iframe.contentWindow.postMessage(cmd, '*'); // String simple
          iframe.contentWindow.postMessage({ type: cmd }, '*'); // Formato 'type'
          iframe.contentWindow.postMessage(JSON.stringify({ type: cmd }), '*');


        } catch (e) {
          console.error("[VirtualTour] Error postMessage", e);
        }
      } else {
        const video = videoRef.current;
        if (!video) return;
        if (playing) {
          video.play().catch(e => console.error("[VirtualTour] Error play nativo", e));
        } else {
          video.pause();
        }
      }
    };

    // Enviar comando inmediatamente
    sendCommand();
    
    // Reintentar brevemente para asegurar recepción
    const timer = setTimeout(sendCommand, 100);
    const timer2 = setTimeout(sendCommand, 300);
    const timer3 = setTimeout(sendCommand, 600);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [playing, isBunny, config.enabled]); // Eliminado currentIndex para evitar disparos innecesarios al cambiar slide

  if (!config.enabled || !hasContent) return null;

  const nextVideo = () => {
    setPlaying(false);
    setHasInteracted(false);
    interactionRef.current = false;
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const prevVideo = () => {
    setPlaying(false);
    setHasInteracted(false);
    interactionRef.current = false;
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const togglePlay = () => {
    if (playing) {
      // Si está reproduciendo, queremos PAUSAR incondicionalmente
      setPlaying(false);
    } else {
      // Si está pausado, queremos REPRODUCIR
      if (!hasInteracted && !interactionRef.current) {
        setHasInteracted(true);
        interactionRef.current = true;
        // Al ser la primera interacción, forzamos true para asegurar update
      }
      setPlaying(true);
    }
  };

  return (
    <section className="py-20 bg-black text-white relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Content */}
          <div className="space-y-8 order-1 lg:order-1">
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
          <div 
            ref={containerRef}
            className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 order-2 lg:order-2 bg-gray-900 group ${isLandscape ? 'aspect-video' : 'h-[500px] lg:h-[700px]'}`}
          >
            {/* Navigation Arrows */}
            {videos.length > 1 && !config.tour_embed && (
                <>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            prevVideo();
                        }}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white transition-all duration-300 border border-white/10 backdrop-blur-sm group pointer-events-auto"
                        aria-label="Video anterior"
                    >
                        <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            nextVideo();
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 p-3 rounded-full bg-black/40 hover:bg-black/80 text-white/70 hover:text-white transition-all duration-300 border border-white/10 backdrop-blur-sm group pointer-events-auto"
                        aria-label="Siguiente video"
                    >
                        <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                </>
            )}

            {/* Custom Controls Overlay */}
            {!config.tour_embed && currentVideo && (
                <div 
                    className="absolute inset-0 z-20 flex flex-col justify-between p-6 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                    onClick={togglePlay}
                >
                    {/* Background overlay */}
                    <div className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${!playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

                    {/* Play/Pause icon */}
                    <div className={`flex-1 flex items-center justify-center relative z-20 transition-all duration-300 ${!playing ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
                        <div className="p-6 rounded-full bg-black/40 border border-white/20 backdrop-blur-md shadow-2xl">
                            {playing ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white ml-1" />}
                        </div>
                    </div>

                    {/* Maximize button */}
                    <div className={`flex justify-center items-center gap-4 relative z-20 transition-opacity duration-300 ${!playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFullscreen();
                            }}
                            className="p-3 rounded-full bg-black/40 hover:bg-black/80 text-white border border-white/10 backdrop-blur-sm flex items-center gap-2 pointer-events-auto"
                        >
                            <Maximize className="w-5 h-5" />
                            <span className="text-sm font-medium">Maximizar</span>
                        </button>
                    </div>
                </div>
            )}

            {config.tour_embed ? (
                 <div 
                    className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                    dangerouslySetInnerHTML={{ __html: config.tour_embed }} 
                />
            ) : currentVideo ? (
                <>
                    {/* Thumbnail Fallback */}
                    {currentVideo.thumbnail_url && !playing && (
                        <div 
                            className="absolute inset-0 z-10 bg-cover bg-center transition-opacity duration-500"
                            style={{ backgroundImage: `url(${currentVideo.thumbnail_url})` }}
                        />
                    )}

                    {isBunny ? (
                                <iframe
                                    key={`${currentVideo.id}-${currentIndex}`}
                                    ref={iframeRef}
                                    src={getBunnyUrl(currentVideo.url, hasInteracted)}
                                    className="w-full h-full border-none pointer-events-none relative z-0"
                                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                                    loading="lazy"
                                />
                            ) : (
                        <video
                            key={`${currentVideo.id}-${currentIndex}`}
                            ref={videoRef}
                            className="w-full h-full object-contain bg-black relative z-0"
                            playsInline
                            onEnded={() => setPlaying(false)}
                            onClick={(e) => e.preventDefault()}
                        />
                    )}
                </>
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
