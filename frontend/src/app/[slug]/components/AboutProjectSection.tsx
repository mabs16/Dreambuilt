'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import ProjectModal from './ProjectModal';
import { Property } from '@/services/properties.service';
import { motion } from 'framer-motion';

interface AboutProjectSectionProps {
    config: Property['about_project_config'];
    defaultDescription: string;
}

export default function AboutProjectSection({ config, defaultDescription }: AboutProjectSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!config?.enabled) {
        return (
            <motion.section 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                id="sobre-el-proyecto" 
                className="py-20 bg-black scroll-mt-24"
            >
                <div className="container mx-auto px-4 max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8 text-white">Sobre el Proyecto</h2>
                    <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {defaultDescription}
                    </p>
                </div>
            </motion.section>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
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

    const imageVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 40 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 1, ease: [0.215, 0.61, 0.355, 1] as const }
        }
    };

    return (
        <section id="sobre-el-proyecto" className="py-20 bg-black scroll-mt-24">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={imageVariants}
                        className="relative h-[500px] lg:h-[700px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                    >
                        {config.image_url ? (
                            <Image
                                src={config.image_url}
                                alt={config.title || "Sobre el Proyecto"}
                                fill
                                className="object-cover transition-transform duration-1000 hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <span className="text-gray-600">Sin imagen configurada</span>
                            </div>
                        )}
                    </motion.div>
                    
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={containerVariants}
                        className="space-y-8"
                    >
                        <motion.div variants={itemVariants}>
                            {config.decorative_title && (
                                <span className="text-amber-500 font-monsieur text-5xl md:text-7xl block mb-4">
                                    {config.decorative_title}
                                </span>
                            )}
                            <h2 className="text-4xl md:text-6xl font-cormorant font-light text-white leading-tight uppercase">
                                {config.title || "Sobre el Proyecto"}
                            </h2>
                        </motion.div>
                        
                        <motion.p 
                            variants={itemVariants}
                            className="text-lg text-gray-300 leading-relaxed font-light whitespace-pre-wrap mb-8"
                        >
                            {config.description || defaultDescription}
                        </motion.p>

                        <motion.div variants={itemVariants} className="border-t border-white/20 w-full mb-8"></motion.div>

                        {config.button_text && (
                            <motion.div variants={itemVariants}>
                                {config.modal_config?.enabled ? (
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center px-8 py-3 bg-transparent border border-amber-500/50 text-white font-medium rounded-full hover:bg-amber-500/10 transition-colors uppercase tracking-wider text-sm group cursor-pointer"
                                    >
                                        <span className="mr-2 text-amber-500">👉</span> 
                                        {config.button_text} 
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : config.button_link ? (
                                    <a 
                                        href={config.button_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-8 py-3 bg-transparent border border-amber-500/50 text-white font-medium rounded-full hover:bg-amber-500/10 transition-colors uppercase tracking-wider text-sm group"
                                    >
                                        {config.button_text}
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </a>
                                ) : null}
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </div>

            {config.modal_config?.enabled && (
                <ProjectModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    config={config.modal_config}
                />
            )}
        </section>
    );
}
