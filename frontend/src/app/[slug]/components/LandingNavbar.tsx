'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, Phone, Facebook, Instagram, Twitter, X } from 'lucide-react';

interface LandingNavbarProps {
  title: string;
  phone?: string;
  showTitle?: boolean;
  callToActionText?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
}

export default function LandingNavbar({ title, phone, showTitle = true, callToActionText = 'Call Us Now', socialLinks }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bloquear scroll cuando el menú está abierto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-300 ${
          isScrolled ? 'bg-black/90 backdrop-blur-md py-3' : 'bg-transparent py-6'
        }`}
      >
        {/* Left Section: Dreambuilt Logo */}
        <div className="flex items-center">
          <div className="relative w-32 h-10 md:w-40 md:h-12">
              <Image 
                  src="https://dreambuilt.b-cdn.net/Logo-Dreambuilt%20web.png" 
                  alt="Dreambuilt" 
                  fill 
                  className="object-contain object-left" 
              />
          </div>
        </div>

        {/* Center Section: Logo (Title) */}
        {showTitle && (
          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <div className="flex flex-col items-center">
              <span className={`text-white font-cormorant tracking-[0.25em] uppercase leading-none font-light transition-all duration-300 ${
                  isScrolled ? 'text-xl md:text-2xl' : 'text-2xl md:text-4xl'
              }`}>
                {title}
              </span>
            </div>
          </div>
        )}

        {/* Right Section: Social, Phone & Menu */}
        <div className="flex items-center space-x-4 md:space-x-6 text-white">
          {phone && (
            <a 
              href={`tel:${phone}`}
              className="hidden lg:flex items-center space-x-2 text-xs uppercase tracking-widest font-medium opacity-80 mr-4 hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Phone className="w-3 h-3" />
              <span>{callToActionText}: {phone}</span>
            </a>
          )}

          <div className="hidden md:flex items-center space-x-3">
            {socialLinks?.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
                <Facebook className="w-3.5 h-3.5" />
              </a>
            )}
            {socialLinks?.instagram && (
              <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
                <Instagram className="w-3.5 h-3.5" />
              </a>
            )}
            {socialLinks?.twitter && (
              <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
                <Twitter className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button 
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center space-x-2 border border-white/30 px-4 py-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm"
          >
            <Menu className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-center transition-all duration-300">
            <button 
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-white/60 hover:text-white transition-colors"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-300">
                <div className="relative w-48 h-16 mb-8">
                    <Image 
                        src="https://dreambuilt.b-cdn.net/Logo-Dreambuilt%20web.png" 
                        alt="Dreambuilt" 
                        fill 
                        className="object-contain" 
                    />
                </div>

                {/* Navigation Links */}
                <nav className="flex flex-col items-center gap-6 mb-8">
                    {[
                        { label: 'Inicio', href: '#inicio' },
                        { label: 'Sobre el Proyecto', href: '#sobre-el-proyecto' },
                        { label: 'Ubicación', href: '#location' },
                        { label: 'Tipologías', href: '#tipologias' },
                        { label: 'Tour Virtual', href: '#tour-virtual' },
                        { label: 'Amenidades', href: '#amenidades' },
                        { label: 'Esquemas de Pago', href: '#esquemas-de-pago' },
                        { label: 'Contacto', href: '#contacto' },
                    ].map((link) => (
                        <a 
                            key={link.label}
                            href={link.href}
                            onClick={(e) => handleNavClick(e, link.href)}
                            className="text-2xl md:text-3xl font-cormorant text-white hover:text-amber-500 transition-colors uppercase tracking-widest"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Mobile Phone Button */}
                {phone && (
                    <a 
                        href={`tel:${phone}`}
                        className="flex items-center gap-3 text-lg font-cormorant text-white hover:text-emerald-400 transition-colors border border-white/20 px-8 py-4 rounded-full"
                    >
                        <Phone className="w-5 h-5" />
                        <span className="tracking-widest uppercase">{callToActionText}: {phone}</span>
                    </a>
                )}

                {/* Mobile Social Links */}
                <div className="flex items-center gap-6 mt-4">
                    {socialLinks?.facebook && (
                        <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-4 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                            <Facebook className="w-6 h-6 text-white" />
                        </a>
                    )}
                    {socialLinks?.instagram && (
                        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-4 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                            <Instagram className="w-6 h-6 text-white" />
                        </a>
                    )}
                    {socialLinks?.twitter && (
                        <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="p-4 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
                            <Twitter className="w-6 h-6 text-white" />
                        </a>
                    )}
                </div>
            </div>
        </div>
      )}
    </>
  );
}
