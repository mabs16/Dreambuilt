'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

interface HeroContentProps {
  config: {
    title?: string;
    subtitle?: string;
    decorative_title_1?: string;
    decorative_title_2?: string;
    overlay_logo?: string;
  };
  defaultSubtitle?: string;
}

export default function HeroContent({ config, defaultSubtitle }: HeroContentProps) {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.215, 0.61, 0.355, 1] as const, // Cubic bezier for smooth "modern" feel
      },
    },
  };

  return (
    <div className="relative z-10 container mx-auto px-6 md:px-12 pb-24 md:pb-32">
      <motion.div 
        className="max-w-6xl"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Overlay Logo */}
        {config.overlay_logo && (
          <motion.div variants={itemVariants} className="mb-8 relative w-80 h-40 md:w-[45rem] md:h-96">
            <Image
              src={config.overlay_logo}
              alt="Project Logo"
              fill
              className="object-contain object-left"
              style={{ filter: 'drop-shadow(1S0 5px 5px rgba(0, 0, 0, 0.9))' }}
              priority
            />
          </motion.div>
        )}

        {/* Overlay Title (Optional) */}
        {config.title && (
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-8xl font-cormorant font-light text-white leading-[0.9] tracking-[-0.02em] mb-6 uppercase"
          >
            {config.title}
          </motion.h1>
        )}

        <motion.p 
          variants={itemVariants}
          className="text-lg md:text-2xl text-white/80 font-cormorant tracking-[0.3em] uppercase mb-12 ml-2 font-medium"
        >
          {config.subtitle || defaultSubtitle?.split('.')[0]}
        </motion.p>
        
        {(config.decorative_title_1 || config.decorative_title_2) && (
          <motion.div variants={itemVariants} className="flex items-baseline space-x-6 ml-2">
            {config.decorative_title_1 && (
              <span className="text-amber-500/90 text-4xl md:text-7xl font-monsieur leading-none">
                {config.decorative_title_1}
              </span>
            )}
            {config.decorative_title_2 && (
              <span className="text-white text-3xl md:text-5xl font-cormorant font-light tracking-wide opacity-90">
                {config.decorative_title_2}
              </span>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
