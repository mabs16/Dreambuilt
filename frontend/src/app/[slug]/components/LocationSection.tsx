'use client';

import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import ClientMap from './ClientMap';
import { Property } from '@/services/properties.service';

interface LocationSectionProps {
    config: Property['location_config'];
}

export default function LocationSection({ config }: LocationSectionProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: [0.215, 0.61, 0.355, 1] as const }
        }
    };

    const mapVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 40 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 1, ease: [0.215, 0.61, 0.355, 1] as const }
        }
    };

    return (
        <section id="location" className="py-20 bg-black relative overflow-hidden min-h-screen flex items-center">
             <div className="container mx-auto px-4 relative z-10 w-full">
                {/* Header */}
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={containerVariants}
                    className="mb-12"
                >
                    <motion.div variants={itemVariants}>
                        {config?.decorative_title && (
                            <span className="text-amber-500 font-monsieur text-2xl md:text-3xl block mb-2 tracking-wider">
                                {config.decorative_title}
                            </span>
                        )}
                    </motion.div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                        <motion.h2 
                            variants={itemVariants}
                            className="text-4xl md:text-6xl font-cormorant font-light text-white uppercase leading-none"
                        >
                            {config?.title || "Project Location"}
                        </motion.h2>
                        
                        {config?.description && (
                            <motion.p 
                                variants={itemVariants}
                                className="text-gray-400 max-w-md text-sm md:text-base leading-relaxed font-light text-right md:text-left"
                            >
                                {config.description}
                            </motion.p>
                        )}
                    </div>
                </motion.div>

                {/* Map Container */}
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={mapVariants}
                    className="relative max-w-4xl mx-auto w-full h-[450px] md:h-[525px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group"
                >
                     <ClientMap 
                        lat={config.lat} 
                        lng={config.lng} 
                        viewLat={config.view_lat}
                        viewLng={config.view_lng}
                        theme="dark"
                        zoom={config.zoom || 13}
                    />
                </motion.div>

                {/* Address Below Map */}
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={itemVariants}
                    className="max-w-4xl mx-auto mt-8 px-4 md:px-0"
                >
                     <div className="flex items-center space-x-4 text-white/90">
                        <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
                            <MapPin className="w-6 h-6 text-amber-500" />
                        </div>
                        <p className="text-xl font-light tracking-wide text-gray-300">{config.address || 'Ubicación privilegiada'}</p>
                     </div>
                </motion.div>
             </div>
        </section>
    );
}
