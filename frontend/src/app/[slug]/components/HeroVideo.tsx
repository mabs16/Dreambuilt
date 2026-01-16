'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { motion } from 'framer-motion';

interface HeroVideoProps {
  url: string;
  className?: string;
}

export default function HeroVideo({ url, className }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Detectar si es embed/iframe directamente en el renderizado
  const isEmbed = url.includes('iframe.mediadelivery.net') || url.includes('/embed/') || url.includes('/play/');

  useEffect(() => {
    // Si es embed, no hacemos nada con HLS
    if (isEmbed) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        autoStartLoad: true,
        startLevel: -1,
        capLevelToPlayerSize: true,
        debug: false
      });
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("Autoplay blocked", e));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
           console.warn("HLS Fatal Error, falling back to embed/native", data);
           // Si falla HLS, tal vez es un MP4 directo o la URL no es válida para HLS
           // No cambiamos a isEmbed automáticamente para dejar que el tag video intente nativamente si es mp4
           hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo para HLS
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log("Autoplay blocked", e));
      });
    } else {
        // Intento directo (MP4 u otro formato soportado nativamente)
        video.src = url;
        video.play().catch(e => console.log("Direct play failed", e));
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [url, isEmbed]);

  if (isEmbed) {
     // Fallback al iframe original si detectamos que es una URL de embed
     // Intentamos limpiar la URL para asegurarnos de que sea un embed válido
     let embedUrl = url;
     if (url.includes('/play/')) {
        embedUrl = url.replace('/play/', '/embed/');
     }
     
     // Aseguramos los parámetros para intentar ocultar lo máximo posible
     const separator = embedUrl.includes('?') ? '&' : '?';
     const finalUrl = `${embedUrl}${separator}autoplay=true&loop=true&muted=true&preload=true&responsive=false&playsinline=true&controls=0`;

     return (
        <motion.iframe 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src={finalUrl}
            className={className}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            style={{ border: 'none', pointerEvents: 'none' }}
            loading="eager"
            // @ts-expect-error - fetchPriority is a valid attribute but not yet in React types
            fetchPriority="high"
        />
     );
  }

  return (
    <motion.video
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      autoPlay
      preload="auto"
      style={{ objectFit: 'cover' }}
    />
  );
}
