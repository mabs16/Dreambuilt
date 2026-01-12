import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PropertiesService } from '@/services/properties.service';
import { MapPin, CheckCircle, Phone, Mail, MessageCircle, ArrowDown } from 'lucide-react';
import ClientMap from './components/ClientMap';
import LandingNavbar from './components/LandingNavbar';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PropertyLandingPage({ params }: PageProps) {
  const { slug } = await params;
  let property;
  try {
    property = await PropertiesService.findBySlug(slug);
  } catch (error) {
    console.error('Error fetching property:', error);
    notFound();
  }

  // Identificar assets por dispositivo
  const videos = property.hero_config.assets.filter(a => a.type === 'video');
  const desktopAsset = videos.find(a => a.device === 'desktop') || videos.find(a => !a.device) || videos[0];
  const mobileAsset = videos.find(a => a.device === 'mobile');
  
  // Fallback para imagen principal
  const mainImage = property.hero_config.assets.find(a => a.type === 'image');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNavbar 
        title={property.title} 
        phone={property.contact_config?.phone} 
      />

      {/* Hero Section */}
      <section className="relative h-screen w-full bg-gray-900 flex flex-col justify-end overflow-hidden">
        {property.hero_config.type === 'video' && (desktopAsset || mobileAsset) ? (
           <>
              {/* Desktop Video */}
              {desktopAsset && (
                 <div className={`absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none ${mobileAsset ? 'hidden md:block' : ''}`}>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh]">
                      <iframe 
                          src={`${desktopAsset.url.replace('/play/', '/embed/')}${desktopAsset.url.includes('?') ? '&' : '?'}autoplay=true&loop=true&muted=true&preload=true&responsive=false&playsinline=true`} 
                          className="absolute top-0 left-0 w-full h-full border-none pointer-events-none"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                          style={{ 
                            objectFit: 'cover',
                          }}
                      />
                    </div>
                    {/* Capa de bloqueo total para ocultar cualquier control residual */}
                    <div className="absolute inset-0 z-[10] bg-transparent pointer-events-auto" />
                    <div className="absolute inset-0 bg-black/40 z-[1]" />
                 </div>
              )}

              {/* Mobile Video */}
              {mobileAsset && (
                 <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none md:hidden">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[177.77vw] h-[100vh] min-w-[100vw] min-h-[56.25vw]">
                      <iframe 
                          src={`${mobileAsset.url.replace('/play/', '/embed/')}${mobileAsset.url.includes('?') ? '&' : '?'}autoplay=true&loop=true&muted=true&preload=true&responsive=false&playsinline=true`} 
                          className="absolute top-0 left-0 w-full h-full border-none pointer-events-none"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                          style={{ 
                            objectFit: 'cover',
                          }}
                      />
                    </div>
                    {/* Capa de bloqueo total para ocultar cualquier control residual */}
                    <div className="absolute inset-0 z-[10] bg-transparent pointer-events-auto" />
                    <div className="absolute inset-0 bg-black/40 z-[1]" />
                 </div>
              )}
           </>
        ) : (
            <div className="absolute inset-0 w-full h-full">
                {mainImage ? (
                    <Image
                    src={mainImage.url}
                    alt={property.title}
                    fill
                    className="object-cover"
                    priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-gray-800" />
                )}
                <div className="absolute inset-0 bg-black/30" />
            </div>
        )}
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 md:px-12 pb-24 md:pb-32">
          <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h1 className="text-7xl md:text-[10rem] font-cormorant font-light text-white leading-[0.8] tracking-[-0.02em] mb-6 uppercase">
              {property.hero_config.title || property.title}
            </h1>
            <p className="text-lg md:text-2xl text-white/80 font-cormorant tracking-[0.3em] uppercase mb-12 ml-2 font-medium">
              {property.hero_config.subtitle || property.description.split('.')[0]}
            </p>
            
            {(property.hero_config.decorative_title_1 || property.hero_config.decorative_title_2) && (
              <div className="flex items-baseline space-x-6 ml-2">
                {property.hero_config.decorative_title_1 && (
                  <span className="text-amber-500/90 text-4xl md:text-7xl font-monsieur leading-none">
                    {property.hero_config.decorative_title_1}
                  </span>
                )}
                {property.hero_config.decorative_title_2 && (
                  <span className="text-white text-3xl md:text-5xl font-cormorant font-light tracking-wide opacity-90">
                    {property.hero_config.decorative_title_2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute right-12 bottom-12 z-10 flex flex-col items-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="white" 
                        strokeWidth="1" 
                        strokeOpacity="0.2"
                    />
                </svg>
                <div className="flex flex-col items-center text-white/60">
                    <span className="text-[10px] uppercase tracking-[0.2em] mb-2">Scroll Down</span>
                    <ArrowDown className="w-4 h-4 animate-bounce" />
                </div>
            </div>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">Sobre el Proyecto</h2>
            <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
                {property.description}
            </p>
        </div>
      </section>

      {/* Typologies Section */}
      {property.typologies && property.typologies.length > 0 && (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold mb-12 text-center text-gray-900">Modelos Disponibles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {property.typologies.map((typo) => (
                        <div key={typo.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                            <div className="h-64 relative bg-gray-200">
                                {typo.image_url ? (
                                    <Image src={typo.image_url} alt={typo.name} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">Sin imagen</div>
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold mb-2 text-gray-900">{typo.name}</h3>
                                {typo.description && (
                                    <p className="text-gray-600 text-sm">{typo.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      )}

      {/* Amenities Section */}
      {property.amenities && property.amenities.length > 0 && (
        <section className="py-20 container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center text-gray-900">Amenidades</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {property.amenities.map((amenity) => (
                    <div key={amenity.id} className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="w-16 h-16 mb-4 relative rounded-full overflow-hidden bg-blue-50 flex items-center justify-center text-blue-600">
                            {amenity.image_url ? (
                                <Image src={amenity.image_url} alt={amenity.name} fill className="object-cover" />
                            ) : (
                                <CheckCircle className="w-8 h-8" />
                            )}
                        </div>
                        <span className="font-medium text-gray-900">{amenity.name}</span>
                    </div>
                ))}
            </div>
        </section>
      )}

      {/* Virtual Tour Section */}
      {property.virtual_tour_config?.enabled && property.virtual_tour_config.content && (
        <section className="py-20 bg-gray-900 text-white">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold mb-12">Recorrido Virtual</h2>
                <div className="max-w-5xl mx-auto aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                    {property.virtual_tour_config.type === 'embed' ? (
                        <div 
                            className="w-full h-full"
                            dangerouslySetInnerHTML={{ __html: property.virtual_tour_config.content }} 
                        />
                    ) : (
                         <iframe 
                            src={property.virtual_tour_config.content} 
                            className="w-full h-full" 
                            allow="autoplay; fullscreen"
                        />
                    )}
                </div>
            </div>
        </section>
      )}

      {/* Location Section */}
      <section className="py-20 container mx-auto px-4">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
                <h2 className="text-3xl font-bold mb-6 text-gray-900">Ubicación</h2>
                <div className="flex items-start space-x-4 mb-8">
                    <MapPin className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <p className="text-xl text-gray-600">{property.location_config.address || 'Ubicación privilegiada'}</p>
                </div>
                {/* Contact Info Preview */}
                <div className="bg-blue-50 p-8 rounded-2xl">
                    <h3 className="text-xl font-bold mb-4 text-blue-900">¿Te interesa este proyecto?</h3>
                    <div className="space-y-4">
                        {property.contact_config?.phone && (
                            <a href={`tel:${property.contact_config.phone}`} className="flex items-center text-blue-700 hover:text-blue-800">
                                <Phone className="w-5 h-5 mr-3" /> {property.contact_config.phone}
                            </a>
                        )}
                        {property.contact_config?.email && (
                            <a href={`mailto:${property.contact_config.email}`} className="flex items-center text-blue-700 hover:text-blue-800">
                                <Mail className="w-5 h-5 mr-3" /> {property.contact_config.email}
                            </a>
                        )}
                        {property.contact_config?.whatsapp && (
                             <a href={`https://wa.me/${property.contact_config.whatsapp}`} target="_blank" className="flex items-center text-green-600 hover:text-green-700 font-medium">
                                <MessageCircle className="w-5 h-5 mr-3" /> Contactar por WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </div>
            <div className="h-[500px] rounded-2xl overflow-hidden shadow-lg">
                {/* Map Component - Read only mode implied by not passing onChange */}
                <ClientMap 
                    lat={property.location_config.lat} 
                    lng={property.location_config.lng} 
                />
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} {property.title}. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
