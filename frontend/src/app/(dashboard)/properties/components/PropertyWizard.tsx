'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Save, Check, Plus, Trash2, MapPin, Home, Video, Image as ImageIcon, Layout, List, Phone, CheckCircle, X, Loader2, FileVideo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { FileUploader } from './FileUploader';
import { PropertiesService, Property } from '@/services/properties.service';

// Dynamically import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

const STEPS = [
  { id: 'info', title: 'Información', icon: Home },
  { id: 'hero', title: 'Hero', icon: ImageIcon },
  { id: 'about', title: 'Sobre el Proyecto', icon: List },
  { id: 'location', title: 'Ubicación', icon: MapPin },
  { id: 'typologies', title: 'Tipologías', icon: Layout },
  { id: 'virtual', title: 'Tour Virtual', icon: Video },
  { id: 'amenities', title: 'Amenidades', icon: List },
  { id: 'contact', title: 'Contacto', icon: Phone },
  { id: 'status', title: 'Estado', icon: CheckCircle },
];

interface PropertyWizardProps {
  initialData?: Partial<Property>;
  isEditing?: boolean;
}

export default function PropertyWizard({ initialData, isEditing = false }: PropertyWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Property>>(initialData || {
    title: '',
    slug: '',
    description: '',
    hero_config: { type: 'image', assets: [] },
    about_project_config: { enabled: false, title: 'Sobre el Proyecto' },
    location_config: { lat: 19.4326, lng: -99.1332, address: '' },
    typologies: [],
    virtual_tour_config: { enabled: false, tour_embed: '', videos: [] },
    amenities: [],
    contact_config: {},
    is_active: true,
  });

  const updateFormData = (updates: Partial<Property>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Force draft status
      const draftData = { ...formData, is_active: false };
      
      let savedProperty;
      if (formData.id) {
        savedProperty = await PropertiesService.update(formData.id, draftData);
      } else {
        savedProperty = await PropertiesService.create(draftData);
      }
      
      // Update local state with saved data (especially ID for new records)
      setFormData(savedProperty);
      alert('Borrador guardado correctamente');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error al guardar el borrador');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEditing && formData.id) {
        await PropertiesService.update(formData.id, formData);
      } else {
        await PropertiesService.create(formData);
      }
      router.push('/properties');
    } catch (error) {
      console.error('Error saving property:', error);
      alert('Error al guardar la propiedad');
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Information
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Título de la Propiedad</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Ej. Torre Mabo Reforma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL)</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => updateFormData({ slug: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="ej. torre-mabo-reforma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-32"
                placeholder="Descripción detallada de la propiedad..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-white/10 mt-4">
               <input
                type="checkbox"
                id="showHeaderTitle"
                checked={formData.hero_config?.show_header_title || false}
                onChange={(e) => updateFormData({ hero_config: { ...formData.hero_config!, show_header_title: e.target.checked } })}
                className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded focus:ring-blue-500"
              />
              <label htmlFor="showHeaderTitle" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                Mostrar nombre de la propiedad en la barra de navegación (Header)
              </label>
            </div>
          </div>
        );

      case 1: // Hero
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Hero</label>
              <div className="flex space-x-4">
                {['image', 'video', 'carousel'].map((type) => (
                  <button
                    key={type}
                    onClick={() => updateFormData({ hero_config: { ...formData.hero_config!, type: type as 'image' | 'video' | 'carousel' } })}
                    className={`px-4 py-2 rounded-lg capitalize ${
                      formData.hero_config?.type === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Assets</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {formData.hero_config?.assets?.map((asset, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10">
                    {asset.type === 'video' ? (
                      <div className="bg-black/50 h-32 flex items-center justify-center relative">
                        <Video className="text-white" />
                        <span className="ml-2 text-xs">Video ID: {asset.videoId}</span>
                        {asset.device && (
                           <span className={`absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${asset.device === 'mobile' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                              {asset.device}
                           </span>
                        )}
                      </div>
                    ) : (
                      <div className="relative h-32 w-full">
                        <Image src={asset.url} alt="Hero Asset" fill className="object-cover" />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const newAssets = [...(formData.hero_config?.assets || [])];
                        newAssets.splice(idx, 1);
                        updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
              
              {formData.hero_config?.type === 'video' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {(() => {
                      const desktopAsset = formData.hero_config?.assets?.find(a => a.device === 'desktop' || (!a.device && a.type === 'video'));
                      const mobileAsset = formData.hero_config?.assets?.find(a => a.device === 'mobile');

                      return (
                        <>
                           <div className={`p-4 rounded-lg border ${desktopAsset ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 bg-white/5'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    Video Desktop (Horizontal)
                                    {desktopAsset && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-400 text-xs flex items-center gap-1">
                                                ✅ Cargado
                                            </span>
                                            <a 
                                                href={desktopAsset.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-gray-400 hover:text-white underline"
                                            >
                                                Ver
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {desktopAsset && (
                                    <button 
                                        onClick={async () => {
                                            if (confirm('¿Estás seguro? Esto eliminará el video del servidor permanentemente.')) {
                                                if (desktopAsset.videoId) {
                                                    await PropertiesService.deleteVideo(desktopAsset.videoId);
                                                }
                                                const newAssets = formData.hero_config?.assets?.filter(a => a !== desktopAsset) || [];
                                                updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                                            }
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Eliminar
                                    </button>
                                )}
                              </div>
                              <FileUploader 
                                  accept="video/*" 
                                  label={desktopAsset ? "Reemplazar Video" : "Subir Video Desktop"}
                                  maxSizeMB={500}
                                  onUpload={async (url: string, type: 'image' | 'video' | 'document', videoId?: string) => {
                                      // Si hay un video anterior, eliminarlo del servidor
                                      const oldDesktopAsset = formData.hero_config?.assets?.find(a => a.device === 'desktop' || (!a.device && a.type === 'video'));
                                      if (oldDesktopAsset?.videoId) {
                                          await PropertiesService.deleteVideo(oldDesktopAsset.videoId);
                                      }

                                      // Eliminar referencia local
                                      const otherAssets = formData.hero_config?.assets?.filter(a => a.device !== 'desktop' && a.device !== undefined) || [];
                                      const newAssets = [...otherAssets, { url, type: 'video' as const, videoId, device: 'desktop' as const }];
                                      updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                                  }}
                              />
                           </div>

                           <div className={`p-4 rounded-lg border ${mobileAsset ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/5 bg-white/5'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    Video Mobile (Vertical)
                                    {mobileAsset && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-400 text-xs flex items-center gap-1">
                                                ✅ Cargado
                                            </span>
                                            <a 
                                                href={mobileAsset.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-gray-400 hover:text-white underline"
                                            >
                                                Ver
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {mobileAsset && (
                                    <button 
                                        onClick={async () => {
                                            if (confirm('¿Estás seguro? Esto eliminará el video del servidor permanentemente.')) {
                                                if (mobileAsset.videoId) {
                                                    await PropertiesService.deleteVideo(mobileAsset.videoId);
                                                }
                                                const newAssets = formData.hero_config?.assets?.filter(a => a !== mobileAsset) || [];
                                                updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                                            }
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Eliminar
                                    </button>
                                )}
                              </div>
                              <FileUploader 
                                  accept="video/*" 
                                  label={mobileAsset ? "Reemplazar Video" : "Subir Video Mobile"}
                                  maxSizeMB={500}
                                  onUpload={async (url: string, type: 'image' | 'video' | 'document', videoId?: string) => {
                                      // Si hay un video anterior, eliminarlo del servidor
                                      const oldMobileAsset = formData.hero_config?.assets?.find(a => a.device === 'mobile');
                                      if (oldMobileAsset?.videoId) {
                                          await PropertiesService.deleteVideo(oldMobileAsset.videoId);
                                      }

                                      // Eliminar referencia local
                                      const otherAssets = formData.hero_config?.assets?.filter(a => a.device !== 'mobile') || [];
                                      const newAssets = [...otherAssets, { url, type: 'video' as const, videoId, device: 'mobile' as const }];
                                      updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                                  }}
                              />
                           </div>
                        </>
                      );
                   })()}
                </div>
              ) : (
                <div>
                   <p className="text-sm text-gray-400 mb-2">Subir Imagen{formData.hero_config?.type === 'carousel' ? 'es' : ''}</p>
                   <FileUploader 
                       accept="image/*" 
                       onUpload={(url: string) => {
                           const newAssets = [...(formData.hero_config?.assets || []), { url, type: 'image' as const }];
                           updateFormData({ hero_config: { ...formData.hero_config!, assets: newAssets } });
                       }}
                   />
                </div>
              )}
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-400 mb-2">Logotipo Superpuesto (Opcional)</label>
               {formData.hero_config?.overlay_logo ? (
                 <div className="relative w-64 h-64 bg-white/5 border border-white/10 rounded-lg p-2 flex items-center justify-center group">
                   <div className="relative w-full h-full">
                     <Image 
                       src={formData.hero_config.overlay_logo} 
                       alt="Overlay Logo" 
                       fill 
                       className="object-contain" 
                     />
                   </div>
                   <button
                     onClick={() => updateFormData({ hero_config: { ...formData.hero_config!, overlay_logo: undefined } })}
                     className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     <X className="w-4 h-4 text-white" />
                   </button>
                 </div>
               ) : (
                 <FileUploader 
                   accept="image/*" 
                   label="Subir Logotipo"
                   onUpload={(url: string) => {
                     updateFormData({ hero_config: { ...formData.hero_config!, overlay_logo: url } });
                   }}
                 />
               )}
               <p className="text-xs text-gray-500 mt-1">Se mostrará sobre el Hero. Puede combinarse con el título.</p>
            </div>

            <div>
               <label className="block text-sm font-medium text-gray-400 mb-1">Título Superpuesto (Opcional)</label>
               <input
                type="text"
                value={formData.hero_config?.title || ''}
                onChange={(e) => updateFormData({ hero_config: { ...formData.hero_config!, title: e.target.value } })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ej. THE BLUEPRINT"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Texto Decorativo 1 (Cursiva - Ej. Seven Sense)</label>
                <input
                  type="text"
                  value={formData.hero_config?.decorative_title_1 || ''}
                  onChange={(e) => updateFormData({ hero_config: { ...formData.hero_config!, decorative_title_1: e.target.value } })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ej. Seven Sense"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Texto Decorativo 2 (Serif - Ej. At Kudamm)</label>
                <input
                  type="text"
                  value={formData.hero_config?.decorative_title_2 || ''}
                  onChange={(e) => updateFormData({ hero_config: { ...formData.hero_config!, decorative_title_2: e.target.value } })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ej. At Kudamm"
                />
              </div>
            </div>
          </div>
        );

      case 2: // About the Project
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
               <input
                type="checkbox"
                id="enableAbout"
                checked={formData.about_project_config?.enabled || false}
                onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, enabled: e.target.checked } })}
                className="w-4 h-4 text-blue-600 bg-white/5 border-white/10 rounded focus:ring-blue-500"
              />
              <label htmlFor="enableAbout" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
                Habilitar Sección &quot;Sobre el Proyecto&quot;
              </label>
            </div>

            {formData.about_project_config?.enabled && (
                <div className="space-y-6 pl-4 border-l border-white/10 ml-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Imagen de la Sección</label>
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                {formData.about_project_config?.image_url ? (
                                    <div className="relative h-48 w-full rounded-lg overflow-hidden group">
                                        <Image 
                                            src={formData.about_project_config.image_url} 
                                            alt="About Project" 
                                            fill 
                                            className="object-cover" 
                                        />
                                        <button
                                            onClick={() => updateFormData({ about_project_config: { ...formData.about_project_config!, image_url: undefined } })}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <FileUploader 
                                        accept="image/*" 
                                        label="Subir Imagen"
                                        onUpload={(url) => {
                                            updateFormData({ about_project_config: { ...formData.about_project_config!, image_url: url } });
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Título Decorativo (Opcional)</label>
                                <input
                                    type="text"
                                    value={formData.about_project_config?.decorative_title || ''}
                                    onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, decorative_title: e.target.value } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="Ej. CONCEPT"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Título Principal</label>
                                <input
                                    type="text"
                                    value={formData.about_project_config?.title || ''}
                                    onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, title: e.target.value } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="Ej. Sobre el Proyecto"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Texto del Botón (Opcional)</label>
                                <input
                                    type="text"
                                    value={formData.about_project_config?.button_text || ''}
                                    onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, button_text: e.target.value } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="Ej. Descargar Brochure"
                                />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Enlace del Botón (Opcional)</label>
                                <input
                                    type="text"
                                    value={formData.about_project_config?.button_link || ''}
                                    onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, button_link: e.target.value } })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    placeholder="https://..."
                                />
                             </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                        <textarea
                            value={formData.about_project_config?.description || ''}
                            onChange={(e) => updateFormData({ about_project_config: { ...formData.about_project_config!, description: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-32"
                            placeholder="Descripción detallada..."
                        />
                    </div>
                </div>
            )}
          </div>
        );

      case 3: // Location
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Título Decorativo (Opcional)</label>
                        <input
                            type="text"
                            value={formData.location_config?.decorative_title || ''}
                            onChange={(e) => updateFormData({ location_config: { ...formData.location_config!, decorative_title: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Ej. PRIME LOCATION"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Título Principal</label>
                        <input
                            type="text"
                            value={formData.location_config?.title || ''}
                            onChange={(e) => updateFormData({ location_config: { ...formData.location_config!, title: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Ej. PROJECT LOCATION"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                        <textarea
                            value={formData.location_config?.description || ''}
                            onChange={(e) => updateFormData({ location_config: { ...formData.location_config!, description: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24"
                            placeholder="Breve descripción de la ubicación..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Zoom del Mapa (8-18)</label>
                        <input
                            type="range"
                            min="8"
                            max="18"
                            value={formData.location_config?.zoom || 13}
                            onChange={(e) => updateFormData({ location_config: { ...formData.location_config!, zoom: parseInt(e.target.value) } })}
                            className="w-full accent-blue-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Lejos (8)</span>
                            <span className="text-white font-bold">{formData.location_config?.zoom || 13}</span>
                            <span>Cerca (18)</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-4">Ubicación en Mapa</label>
                    <div className="h-[300px] w-full bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                        <MapPicker
                            lat={formData.location_config?.lat || 19.4326}
                            lng={formData.location_config?.lng || -99.1332}
                            onChange={(lat, lng) => updateFormData({ location_config: { ...formData.location_config!, lat, lng } })}
                            theme="dark"
                            zoom={formData.location_config?.zoom || 13}
                        />
                    </div>
                </div>
             </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Dirección Escrita</label>
              <input
                type="text"
                value={formData.location_config?.address || ''}
                onChange={(e) => updateFormData({ location_config: { ...formData.location_config!, address: e.target.value } })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Calle 123, Col. Centro..."
              />
            </div>
          </div>
        );

      case 4: // Typologies
        return (
          <div className="space-y-6">
            <div className="space-y-4 mb-8 pb-8 border-b border-white/10">
                 <h3 className="text-lg font-medium text-white mb-4">Configuración de la Sección</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Título Decorativo (Opcional)</label>
                        <input
                            type="text"
                            value={formData.typologies_config?.decorative_title || ''}
                            onChange={(e) => updateFormData({ typologies_config: { ...formData.typologies_config, decorative_title: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Ej. EXPLORA"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Título Principal</label>
                        <input
                            type="text"
                            value={formData.typologies_config?.title || ''}
                            onChange={(e) => updateFormData({ typologies_config: { ...formData.typologies_config, title: e.target.value } })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            placeholder="Ej. PLANOS"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Descripción de la Sección (Opcional)</label>
                    <textarea
                        value={formData.typologies_config?.description || ''}
                        onChange={(e) => updateFormData({ typologies_config: { ...formData.typologies_config, description: e.target.value } })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-20"
                        placeholder="Descripción general de los modelos..."
                    />
                 </div>
            </div>

            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Planos y Modelos</h3>
                <button 
                    onClick={() => {
                        const newTypo = { id: crypto.randomUUID(), name: 'Nuevo Modelo', image_url: '' };
                        updateFormData({ typologies: [...(formData.typologies || []), newTypo] });
                    }}
                    className="flex items-center space-x-2 bg-blue-600 px-3 py-1.5 rounded-lg text-sm"
                >
                    <Plus className="w-4 h-4" /> <span>Agregar</span>
                </button>
            </div>
            
            <div className="space-y-4">
                {formData.typologies?.map((typo, idx) => (
                    <div key={typo.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex gap-4">
                        <div className="w-32 h-32 bg-black/20 rounded-lg flex-shrink-0 overflow-hidden relative group">
                            {typo.image_url ? (
                                <Image src={typo.image_url} alt={typo.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Sin imagen</div>
                            )}
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <FileUploader 
                                    accept="image/*"
                                    label="Cambiar"
                                    onUpload={(url) => {
                                        const newTypos = [...(formData.typologies || [])];
                                        newTypos[idx].image_url = url;
                                        updateFormData({ typologies: newTypos });
                                    }}
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-3">
                            <input
                                type="text"
                                value={typo.name}
                                onChange={(e) => {
                                    const newTypos = [...(formData.typologies || [])];
                                    newTypos[idx].name = e.target.value;
                                    updateFormData({ typologies: newTypos });
                                }}
                                className="w-full bg-transparent border-b border-white/10 focus:border-blue-500 text-white px-2 py-1"
                                placeholder="Nombre del modelo"
                            />
                            <textarea
                                value={typo.description || ''}
                                onChange={(e) => {
                                    const newTypos = [...(formData.typologies || [])];
                                    newTypos[idx].description = e.target.value;
                                    updateFormData({ typologies: newTypos });
                                }}
                                className="w-full bg-white/5 rounded p-2 text-sm text-gray-300"
                                placeholder="Descripción..."
                                rows={2}
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const newTypos = [...(formData.typologies || [])];
                                newTypos.splice(idx, 1);
                                updateFormData({ typologies: newTypos });
                            }}
                            className="text-red-400 hover:text-red-300 self-start"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        );

      case 5: // Virtual Tour
        return (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-4">
                <input 
                    type="checkbox"
                    checked={formData.virtual_tour_config?.enabled}
                    onChange={(e) => updateFormData({ virtual_tour_config: { ...formData.virtual_tour_config!, enabled: e.target.checked } })}
                    className="w-5 h-5 rounded border-gray-600"
                />
                <label className="text-white font-medium">Habilitar Sección Multimedia</label>
            </div>

            {formData.virtual_tour_config?.enabled && (
                <div className="space-y-6 pl-8 border-l-2 border-white/10">
                    {/* Títulos y Descripción */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Título Decorativo</label>
                            <input
                                type="text"
                                value={formData.virtual_tour_config?.decorative_title || ''}
                                onChange={(e) => updateFormData({ virtual_tour_config: { ...formData.virtual_tour_config!, decorative_title: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="Ej. VIRTUAL TOUR"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Título Principal</label>
                            <input
                                type="text"
                                value={formData.virtual_tour_config?.title || ''}
                                onChange={(e) => updateFormData({ virtual_tour_config: { ...formData.virtual_tour_config!, title: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                placeholder="Ej. Conoce tu futuro hogar"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                            <textarea
                                value={formData.virtual_tour_config?.description || ''}
                                onChange={(e) => updateFormData({ virtual_tour_config: { ...formData.virtual_tour_config!, description: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24"
                                placeholder="Descripción de la sección..."
                            />
                        </div>
                    </div>

                    {/* Recorrido Virtual 3D */}
                    <div className="pt-4 border-t border-white/10">
                        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                            <Video className="w-4 h-4 text-blue-400" />
                            Recorrido Virtual 3D (Matterport)
                        </h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Código Embed / URL</label>
                            <textarea
                                value={formData.virtual_tour_config?.tour_embed || ''}
                                onChange={(e) => updateFormData({ virtual_tour_config: { ...formData.virtual_tour_config!, tour_embed: e.target.value } })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24 font-mono text-xs"
                                placeholder="<iframe src='...'></iframe>"
                            />
                        </div>
                    </div>

                    {/* Videos Promocionales */}
                    <div className="pt-4 border-t border-white/10">
                        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-purple-400" />
                            Videos Promocionales
                        </h4>
                        
                        {/* Lista de Videos */}
                        {formData.virtual_tour_config?.videos && formData.virtual_tour_config.videos.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {formData.virtual_tour_config.videos.map((video, idx) => (
                                    <div key={video.id || idx} className="group relative bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                                        <div className="aspect-video bg-black/50 relative">
                                            {/* Usamos iframe con pointer-events-none para simular miniatura si es embed de bunny, o video tag si es archivo directo */}
                                            <iframe 
                                                src={video.url} 
                                                className="w-full h-full pointer-events-none" 
                                                loading="lazy"
                                                title={`Video ${idx}`}
                                            />
                                            <div className="absolute inset-0 bg-transparent" /> {/* Overlay para prevenir interacción */}
                                        </div>
                                        
                                        <button
                                            onClick={async () => {
                                                if (confirm('¿Estás seguro de eliminar este video?')) {
                                                    try {
                                                        // Eliminar de Bunny.net
                                                        await PropertiesService.deleteVideo(video.id);
                                                        
                                                        // Actualizar estado local
                                                        const newVideos = [...(formData.virtual_tour_config?.videos || [])];
                                                        newVideos.splice(idx, 1);
                                                        updateFormData({ 
                                                            virtual_tour_config: { 
                                                                ...formData.virtual_tour_config!, 
                                                                videos: newVideos 
                                                            } 
                                                        });
                                                    } catch (error) {
                                                        console.error('Error deleting video:', error);
                                                        alert('Error al eliminar el video');
                                                    }
                                                }
                                            }}
                                            className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            title="Eliminar video"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="p-3 space-y-3">
                                            <input 
                                                type="text"
                                                value={video.title || ''} 
                                                onChange={(e) => {
                                                    const newVideos = [...(formData.virtual_tour_config?.videos || [])];
                                                    newVideos[idx] = { ...newVideos[idx], title: e.target.value };
                                                    updateFormData({ 
                                                        virtual_tour_config: { 
                                                            ...formData.virtual_tour_config!, 
                                                            videos: newVideos 
                                                        } 
                                                    });
                                                }}
                                                placeholder="Título del video (Opcional)"
                                                className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 focus:text-white focus:outline-none border-b border-transparent focus:border-blue-500/50 transition-colors"
                                            />
                                            
                                            <div>
                                                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">Orientación</label>
                                                <select
                                                    value={video.orientation || 'portrait'}
                                                    onChange={(e) => {
                                                        const newVideos = [...(formData.virtual_tour_config?.videos || [])];
                                                        newVideos[idx] = { 
                                                            ...newVideos[idx], 
                                                            orientation: e.target.value as 'landscape' | 'portrait' 
                                                        };
                                                        updateFormData({ 
                                                            virtual_tour_config: { 
                                                                ...formData.virtual_tour_config!, 
                                                                videos: newVideos 
                                                            } 
                                                        });
                                                    }}
                                                    className="w-full bg-white/5 text-xs text-gray-300 border border-white/10 rounded px-2 py-1.5 focus:border-blue-500 focus:outline-none appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                                                >
                                                    <option value="portrait" className="bg-gray-900 text-white">Vertical (9:16)</option>
                                                    <option value="landscape" className="bg-gray-900 text-white">Horizontal (16:9)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Subir Nuevo Video</label>
                            <FileUploader 
                                accept="video/*"
                                maxSizeMB={500}
                                onUpload={(url, type, videoId) => {
                                    if (type === 'video' && videoId) {
                                        const newVideo = {
                                            id: videoId,
                                            url: url,
                                            title: `Video ${(formData.virtual_tour_config?.videos?.length || 0) + 1}`,
                                            orientation: 'portrait' as 'landscape' | 'portrait',
                                            thumbnail_url: '' // TODO: Intentar obtener thumbnail
                                        };
                                        
                                        const currentVideos = formData.virtual_tour_config?.videos || [];
                                        updateFormData({ 
                                            virtual_tour_config: { 
                                                ...formData.virtual_tour_config!, 
                                                videos: [...currentVideos, newVideo] 
                                            } 
                                        });
                                    }
                                }}
                                label="Arrastra un video aquí o haz clic para subir"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Los videos se subirán a Bunny.net Stream y se optimizarán automáticamente.
                            </p>
                        </div>
                    </div>
                </div>
            )}
          </div>
        );

      case 6: // Amenities
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Amenidades</h3>
                <button 
                    onClick={() => {
                        const newAmenity = { id: crypto.randomUUID(), name: 'Nueva Amenidad' };
                        updateFormData({ amenities: [...(formData.amenities || []), newAmenity] });
                    }}
                    className="flex items-center space-x-2 bg-blue-600 px-3 py-1.5 rounded-lg text-sm"
                >
                    <Plus className="w-4 h-4" /> <span>Agregar</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.amenities?.map((amenity, idx) => (
                    <div key={amenity.id} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                         <div className="w-12 h-12 bg-black/20 rounded flex-shrink-0 overflow-hidden relative group">
                            {amenity.image_url ? (
                                <Image src={amenity.image_url} alt={amenity.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500"><ImageIcon className="w-4 h-4"/></div>
                            )}
                             <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <FileUploader 
                                    accept="image/*"
                                    label=""
                                    onUpload={(url) => {
                                        const newAmenities = [...(formData.amenities || [])];
                                        newAmenities[idx].image_url = url;
                                        updateFormData({ amenities: newAmenities });
                                    }}
                                />
                            </div>
                         </div>
                         <input
                            type="text"
                            value={amenity.name}
                            onChange={(e) => {
                                const newAmenities = [...(formData.amenities || [])];
                                newAmenities[idx].name = e.target.value;
                                updateFormData({ amenities: newAmenities });
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 focus:border-blue-500 text-white px-2 py-1"
                        />
                         <button 
                            onClick={() => {
                                const newAmenities = [...(formData.amenities || [])];
                                newAmenities.splice(idx, 1);
                                updateFormData({ amenities: newAmenities });
                            }}
                            className="text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
          </div>
        );

      case 7: // Contact
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email de Contacto</label>
                    <input
                        type="email"
                        value={formData.contact_config?.email || ''}
                        onChange={(e) => updateFormData({ contact_config: { ...formData.contact_config!, email: e.target.value } })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Teléfono</label>
                    <input
                        type="tel"
                        value={formData.contact_config?.phone || ''}
                        onChange={(e) => updateFormData({ contact_config: { ...formData.contact_config!, phone: e.target.value } })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp (Formato Internacional: 521...)</label>
                    <input
                        type="tel"
                        value={formData.contact_config?.whatsapp || ''}
                        onChange={(e) => updateFormData({ contact_config: { ...formData.contact_config!, whatsapp: e.target.value } })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    />
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                    <h3 className="text-white font-medium mb-4">Configuración del Header</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Texto de Llamada (Ej. Call Us Now)</label>
                        <input
                            type="text"
                            value={formData.contact_config?.call_to_action_text || ''}
                            onChange={(e) => updateFormData({ contact_config: { ...formData.contact_config!, call_to_action_text: e.target.value } })}
                            placeholder="Call Us Now"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Link Facebook</label>
                            <input
                                type="text"
                                value={formData.contact_config?.social_links?.facebook || ''}
                                onChange={(e) => updateFormData({ 
                                    contact_config: { 
                                        ...formData.contact_config!, 
                                        social_links: { ...formData.contact_config?.social_links, facebook: e.target.value } 
                                    } 
                                })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Link Instagram</label>
                            <input
                                type="text"
                                value={formData.contact_config?.social_links?.instagram || ''}
                                onChange={(e) => updateFormData({ 
                                    contact_config: { 
                                        ...formData.contact_config!, 
                                        social_links: { ...formData.contact_config?.social_links, instagram: e.target.value } 
                                    } 
                                })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Link Twitter/X</label>
                            <input
                                type="text"
                                value={formData.contact_config?.social_links?.twitter || ''}
                                onChange={(e) => updateFormData({ 
                                    contact_config: { 
                                        ...formData.contact_config!, 
                                        social_links: { ...formData.contact_config?.social_links, twitter: e.target.value } 
                                    } 
                                })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>
                    </div>
                </div>
             </div>
          </div>
        );

      case 8: // Status
        return (
          <div className="space-y-6 text-center py-10">
             <div className="flex justify-center mb-4">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${formData.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}>
                    <CheckCircle className="w-10 h-10" />
                </div>
             </div>
             
             <h3 className="text-xl font-bold text-white mb-2">
                {formData.is_active ? 'Propiedad Activa' : 'Borrador / Inactiva'}
             </h3>
             
             <p className="text-gray-400 max-w-md mx-auto mb-8">
                Revisa toda la información antes de guardar. Si desactivas la propiedad, no será visible en el sitio público.
             </p>

             <button
                onClick={() => updateFormData({ is_active: !formData.is_active })}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                    formData.is_active 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                    : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                }`}
             >
                {formData.is_active ? 'Desactivar Propiedad' : 'Activar Propiedad'}
             </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col h-full overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-6 px-2">Configuración</h2>
        <div className="space-y-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500/20 text-green-500' : 'bg-white/10'
                }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="font-medium">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-white">{STEPS[currentStep].title}</h1>
                <p className="text-gray-400 text-sm">Paso {currentStep + 1} de {STEPS.length}</p>
            </div>
            <div className="flex space-x-3">
                 <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white flex items-center border border-white/10"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Borrador
                </button>
                 <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                </button>
                {currentStep === STEPS.length - 1 ? (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {isEditing ? 'Actualizar' : 'Publicar'}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center"
                    >
                        Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                    </button>
                )}
            </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-8">
            <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
            >
                {renderStepContent()}
            </motion.div>
        </div>
      </div>
    </div>
  );
}
