import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: {
        decorative_title?: string;
        title?: string;
        description?: string;
        images?: string[];
    };
}

export default function ProjectModal({ isOpen, onClose, config }: ProjectModalProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = config.images || [];

    const nextImage = () => {
        if (images.length === 0) return;
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        if (images.length === 0) return;
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[80vh] z-10"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/80 transition-all border border-white/10"
                        >
                            <X size={20} />
                        </button>

                        {/* Carousel Section */}
                        <div className="w-full md:w-2/3 relative bg-black flex items-center justify-center h-[300px] md:h-auto shrink-0">
                            {images.length > 0 ? (
                                <>
                                    <div className="relative w-full h-full">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentImageIndex}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.5 }}
                                                className="absolute inset-0"
                                            >
                                                <Image
                                                    src={images[currentImageIndex]}
                                                    alt={`Project Image ${currentImageIndex + 1}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </motion.div>
                                        </AnimatePresence>
                                        
                                        {/* Navigation Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-100 md:opacity-0 md:hover:opacity-100 transition-opacity duration-300">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="p-3 rounded-full bg-black/50 text-white border border-white/10 hover:bg-black/70 transition-all backdrop-blur-sm"
                                            >
                                                <ChevronLeft size={24} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="p-3 rounded-full bg-black/50 text-white border border-white/10 hover:bg-black/70 transition-all backdrop-blur-sm"
                                            >
                                                <ChevronRight size={24} />
                                            </button>
                                        </div>

                                        {/* Indicators */}
                                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-10">
                                            {images.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`w-2 h-2 rounded-full transition-all shadow-lg ${
                                                        idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-500">Sin imágenes disponibles</div>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="w-full md:w-1/3 flex-1 md:flex-none p-6 md:p-12 overflow-y-auto custom-scrollbar border-t md:border-t-0 md:border-l border-white/10 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
                            <div className="space-y-6">
                                <div>
                                    {config.decorative_title && (
                                        <span className="text-amber-500 font-monsieur text-4xl block mb-2">
                                            {config.decorative_title}
                                        </span>
                                    )}
                                    <h3 className="text-3xl font-cormorant font-light text-white leading-tight uppercase">
                                        {config.title || "Detalle del Proyecto"}
                                    </h3>
                                </div>
                                <div className="w-12 h-0.5 bg-amber-500/50" />
                                <p className="text-gray-300 font-light leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                                    {config.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
