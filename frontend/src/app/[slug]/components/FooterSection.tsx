'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

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

export default function FooterSection({ config }: FooterSectionProps) {
  if (!config.enabled) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white pt-20 pb-8 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-12 text-center">
          
          {/* Logo & Description */}
          <div className="flex flex-col items-center max-w-2xl mx-auto">
            <div className="relative w-48 h-16 mb-6">
                <Image 
                    src={config.logo_url || "https://dreambuilt.b-cdn.net/Logo-Dreambuilt%20web.png"} 
                    alt="Dreambuilt" 
                    fill 
                    className="object-contain" 
                />
            </div>
            {config.description && (
              <p className="text-gray-400 font-light text-sm md:text-base mb-8 max-w-lg mx-auto">
                {config.description}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          {config.links && config.links.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-12 border-y border-white/10 py-8">
              {config.links.map((link, index) => (
                <Link 
                  key={index} 
                  href={link.url} 
                  className="text-gray-300 hover:text-white transition-colors text-sm uppercase tracking-wider font-light"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Social Media */}
          <div className="mb-12">
            <h4 className="text-white text-lg font-cormorant mb-6">Follow Us on Social Media</h4>
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
        <div className="border-t border-white/10 my-8"></div>

        {/* Copyright */}
        <div className="text-center">
            <p className="text-gray-500 text-sm font-light mb-8">
                {config.copyright_text || `Copyright © ${currentYear} - Dreambuilt Construction. All Right Reserved.`}
            </p>
            
            {/* Disclaimer */}
            {config.disclaimer_text && (
                <div className="max-w-4xl mx-auto mt-8">
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
