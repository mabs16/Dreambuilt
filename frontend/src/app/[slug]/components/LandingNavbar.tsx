'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, Phone, Facebook, Instagram, Twitter } from 'lucide-react';

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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav 
      className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 md:px-12 transition-all duration-300 ${
        isScrolled ? 'bg-gray-900/90 backdrop-blur-md py-3' : 'bg-transparent py-6'
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
          <div className="hidden lg:flex items-center space-x-2 text-xs uppercase tracking-widest font-medium opacity-80 mr-4">
            <Phone className="w-3 h-3" />
            <span>{callToActionText}: {phone}</span>
          </div>
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

        <button className="flex items-center space-x-2 border border-white/30 px-4 py-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm">
          <Menu className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
