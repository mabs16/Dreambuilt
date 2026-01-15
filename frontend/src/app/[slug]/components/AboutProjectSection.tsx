'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import ProjectModal from './ProjectModal';
import { Property } from '@/services/properties.service';

interface AboutProjectSectionProps {
    config: Property['about_project_config'];
    defaultDescription: string;
}

export default function AboutProjectSection({ config, defaultDescription }: AboutProjectSectionProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!config?.enabled) {
        return (
            <section id="sobre-el-proyecto" className="py-20 bg-black scroll-mt-24">
                <div className="container mx-auto px-4 max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-8 text-white">Sobre el Proyecto</h2>
                    <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {defaultDescription}
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section id="sobre-el-proyecto" className="py-20 bg-black scroll-mt-24">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative h-[500px] lg:h-[700px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        {config.image_url ? (
                            <Image
                                src={config.image_url}
                                alt={config.title || "Sobre el Proyecto"}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <span className="text-gray-600">Sin imagen configurada</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-8">
                        <div>
                            {config.decorative_title && (
                                <span className="text-amber-500 font-monsieur text-5xl md:text-7xl block mb-4">
                                    {config.decorative_title}
                                </span>
                            )}
                            <h2 className="text-4xl md:text-6xl font-cormorant font-light text-white leading-tight uppercase">
                                {config.title || "Sobre el Proyecto"}
                            </h2>
                        </div>
                        
                        <p className="text-lg text-gray-300 leading-relaxed font-light whitespace-pre-wrap mb-8">
                            {config.description || defaultDescription}
                        </p>

                        <div className="border-t border-white/20 w-full mb-8"></div>

                        {config.button_text && (
                            config.modal_config?.enabled ? (
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
                            ) : null
                        )}
                    </div>
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
