'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Linkedin, Youtube, ChevronLeft, ChevronRight } from 'lucide-react';

interface FooterSectionProps {
  config: {
    enabled: boolean;
    logo_url?: string;
    description?: string;
    copyright_text?: string;
    disclaimer_text?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      youtube?: string;
    };
    contact_info?: {
      address?: string;
      email?: string;
      phone?: string;
    };
    links?: {
      label: string;
      url: string;
    }[];
  };
}

const MENU_LINKS = [
  { label: 'Inicio', url: '#inicio' },
  { label: 'Sobre el Proyecto', url: '#sobre-el-proyecto' },
  { label: 'Ubicación', url: '#location' },
  { label: 'Tipologías', url: '#tipologias' },
  { label: 'Tour Virtual', url: '#tour-virtual' },
  { label: 'Amenidades', url: '#amenidades' },
  { label: 'Esquemas de Pago', url: '#esquemas-de-pago' },
  { label: 'Contacto', url: '#contacto' },
];

export default function FooterSection({ config }: FooterSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  if (!config.enabled) return null;

  const currentYear = new Date().getFullYear();
  // Use config.links if provided (and not empty), otherwise fallback to MENU_LINKS
  // Actually, user asked to match menu sections specifically. 
  // Let's prioritize config.links if they exist, but if it's the default empty array, use MENU_LINKS.
  const navigationLinks = (config.links && config.links.length > 0) ? config.links : MENU_LINKS;

  return (
    <footer className="bg-black text-white pt-10 md:pt-20 pb-8 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8 md:gap-12 text-center">
          
          {/* Logo & Description */}
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            <div className="relative w-48 h-16 mb-4 md:mb-6">
                <Image 
                    src={config.logo_url || "https://dreambuilt.b-cdn.net/Logo-Dreambuilt%20web.png"} 
                    alt="Dreambuilt" 
                    fill 
                    className="object-contain" 
                />
            </div>
            {config.description && (
              <p className="text-gray-400 font-light text-sm md:text-base mb-6 md:mb-8 max-w-lg mx-auto">
                {config.description}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          {navigationLinks.length > 0 && (
            <div className="relative mb-8 md:mb-12 border-y border-white/10 py-6 md:py-8 group">
              {/* Mobile Left Arrow */}
              <button
                onClick={() => scroll('left')}
                className={`md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 text-white transition-all duration-300 ${
                  showLeftArrow ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                }`}
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Mobile Right Arrow */}
              <button
                onClick={() => scroll('right')}
                className={`md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 text-white transition-all duration-300 ${
                  showRightArrow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
                }`}
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div 
                ref={scrollContainerRef}
                onScroll={checkScroll}
                className="flex md:flex-wrap md:justify-center items-center gap-x-8 gap-y-4 overflow-x-auto scrollbar-hide px-8 md:px-0"
              >
                {navigationLinks.map((link, index) => (
                  <Link 
                    key={index} 
                    href={link.url} 
                    className="text-gray-300 hover:text-white transition-colors text-sm uppercase tracking-wider font-light whitespace-nowrap flex-shrink-0"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Social Media */}
          <div className="mb-8 md:mb-12">
            <h4 className="text-white text-lg font-cormorant mb-4 md:mb-6">Síguenos en Redes Sociales</h4>
            <div className="flex justify-center space-x-6">
              {config.social_links?.facebook && (
                <a href={config.social_links.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center hover:opacity-80 transition-opacity text-white">
                  <Facebook size={20} />
                </a>
              )}
              {config.social_links?.instagram && (
                <a href={config.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center hover:opacity-80 transition-opacity text-white">
                  <Instagram size={20} />
                </a>
              )}
              {config.social_links?.twitter && (
                <a href={config.social_links.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center hover:opacity-80 transition-opacity text-white">
                  <Twitter size={20} />
                </a>
              )}
              {config.social_links?.linkedin && (
                <a href={config.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center hover:opacity-80 transition-opacity text-white">
                  <Linkedin size={20} />
                </a>
              )}
              {config.social_links?.youtube && (
                <a href={config.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center hover:opacity-80 transition-opacity text-white">
                  <Youtube size={20} />
                </a>
              )}
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-6 md:my-8"></div>

        {/* Copyright */}
        <div className="text-center">
            <p className="text-gray-500 text-sm font-light mb-4 md:mb-8">
                {config.copyright_text || `Copyright © ${currentYear} - Dreambuilt Construction. All Right Reserved.`}
            </p>
            
            {/* Disclaimer */}
            {config.disclaimer_text && (
                <div className="max-w-4xl mx-auto mt-4 md:mt-8">
                    <p className="text-[10px] text-gray-600 text-justify leading-relaxed whitespace-pre-wrap">
                        {config.disclaimer_text}
                    </p>
                </div>
            )}
        </div>
      </div>
    </footer>
  );
}
