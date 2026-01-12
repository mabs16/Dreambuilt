'use client';

import { Menu, Phone, Facebook, Instagram, Twitter, ChevronDown } from 'lucide-react';

interface LandingNavbarProps {
  title: string;
  phone?: string;
}

export default function LandingNavbar({ title, phone }: LandingNavbarProps) {
  return (
    <nav className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-6 md:px-12">
      {/* Left Section: Menu & Phone */}
      <div className="flex items-center space-x-6 text-white">
        <button className="flex items-center space-x-2 border border-white/30 px-4 py-2 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm">
          <Menu className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-medium">Menu</span>
        </button>
        {phone && (
          <div className="hidden lg:flex items-center space-x-2 text-xs uppercase tracking-widest font-medium opacity-80">
            <Phone className="w-3 h-3" />
            <span>Call Us Now: {phone}</span>
          </div>
        )}
      </div>

      {/* Center Section: Logo */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <div className="flex flex-col items-center">
          <span className="text-white text-2xl md:text-4xl font-cormorant tracking-[0.25em] uppercase leading-none font-light">
            {title}
          </span>
          <span className="text-white/50 text-[7px] md:text-[9px] uppercase tracking-[0.5em] mt-2 font-medium">
            Inspiring Construction Projects
          </span>
        </div>
      </div>

      {/* Right Section: Social & CTA */}
      <div className="flex items-center space-x-4 md:space-x-6 text-white">
        <div className="hidden md:flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
            <Facebook className="w-3.5 h-3.5" />
          </div>
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
            <Instagram className="w-3.5 h-3.5" />
          </div>
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all">
            <Twitter className="w-3.5 h-3.5" />
          </div>
        </div>
        <button className="flex items-center space-x-2 border border-white/30 px-6 py-2.5 rounded-full hover:bg-white/10 transition-colors backdrop-blur-sm group">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-medium">Select An Apartment</span>
          <ChevronDown className="w-3 h-3 md:w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    </nav>
  );
}
