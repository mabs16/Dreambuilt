import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PropertiesService } from '@/services/properties.service';
import { MapPin, ArrowRight } from 'lucide-react';
import ClientMap from './components/ClientMap';
import LandingNavbar from './components/LandingNavbar';
import FloorPlansSection from './components/FloorPlansSection';
import VirtualTourSection from './components/VirtualTourSection';
import AmenitiesSection from './components/AmenitiesSection';
import PaymentSchemesSection from './components/PaymentSchemesSection';
import ContactSection from './components/ContactSection';
import SectionSeparator from './components/SectionSeparator';
import FooterSection from './components/FooterSection';
import HeroVideo from './components/HeroVideo';

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
    <div className="min-h-screen bg-black text-white">
      <LandingNavbar 
        title={property.title} 
        phone={property.contact_config?.phone} 
        showTitle={property.hero_config.show_header_title}
        callToActionText={property.contact_config?.call_to_action_text}
        socialLinks={property.contact_config?.social_links}
      />

      {/* Hero Section */}
      <section id="inicio" className="relative h-screen w-full bg-black flex flex-col justify-end overflow-hidden">
        {property.hero_config.type === 'video' && (desktopAsset || mobileAsset) ? (
           <>
              {/* Desktop Video */}
              {desktopAsset && (
                 <div className={`absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none ${mobileAsset ? 'hidden md:block' : ''}`}>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.77vh]">
                      <HeroVideo 
                          url={desktopAsset.url}
                          className="absolute top-0 left-0 w-full h-full border-none pointer-events-none"
                      />
                    </div>
                    {/* Capa de bloqueo total para ocultar cualquier control residual */}
                    <div className="absolute inset-0 z-[10] bg-transparent pointer-events-auto" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-black/90 z-[1]" />
                 </div>
              )}

              {/* Mobile Video */}
              {mobileAsset && (
                 <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none md:hidden">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[177.77vw] h-[100vh] min-w-[100vw] min-h-[56.25vw]">
                      <HeroVideo 
                          url={mobileAsset.url}
                          className="absolute top-0 left-0 w-full h-full border-none pointer-events-none"
                      />
                    </div>
                    {/* Capa de bloqueo total para ocultar cualquier control residual */}
                    <div className="absolute inset-0 z-[10] bg-transparent pointer-events-auto" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80 z-[1]" />
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
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
            </div>
        )}
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 md:px-12 pb-24 md:pb-32">
          <div className="max-w-6xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
            
            {/* Overlay Logo */}
            {property.hero_config.overlay_logo && (
              <div className="mb-8 relative w-80 h-40 md:w-[45rem] md:h-96">
                <Image
                  src={property.hero_config.overlay_logo}
                  alt="Project Logo"
                  fill
                  className="object-contain object-left"
                  style={{ filter: 'drop-shadow(1S0 5px 5px rgba(0, 0, 0, 0.9))' }}
                  priority
                />
              </div>
            )}

            {/* Overlay Title (Optional) */}
            {property.hero_config.title && (
              <h1 className="text-5xl md:text-8xl font-cormorant font-light text-white leading-[0.9] tracking-[-0.02em] mb-6 uppercase">
                {property.hero_config.title}
              </h1>
            )}

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


      </section>

      <SectionSeparator />

      {/* About Project Section */}
      <section id="sobre-el-proyecto" className="py-20 bg-black scroll-mt-24">
        {property.about_project_config?.enabled ? (
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="relative h-[500px] lg:h-[700px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        {property.about_project_config.image_url ? (
                            <Image
                                src={property.about_project_config.image_url}
                                alt={property.about_project_config.title || "Sobre el Proyecto"}
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
                            {property.about_project_config.decorative_title && (
                                <span className="text-amber-500 font-monsieur text-5xl md:text-7xl block mb-4">
                                    {property.about_project_config.decorative_title}
                                </span>
                            )}
                            <h2 className="text-4xl md:text-6xl font-cormorant font-light text-white leading-tight uppercase">
                                {property.about_project_config.title || "Sobre el Proyecto"}
                            </h2>
                        </div>
                        
                        <p className="text-lg text-gray-300 leading-relaxed font-light whitespace-pre-wrap mb-8">
                            {property.about_project_config.description || property.description}
                        </p>

                        <div className="border-t border-white/20 w-full mb-8"></div>

                        {property.about_project_config.button_text && property.about_project_config.button_link && (
                            <a 
                                href={property.about_project_config.button_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-8 py-3 bg-transparent border border-amber-500/50 text-white font-medium rounded-full hover:bg-amber-500/10 transition-colors uppercase tracking-wider text-sm group"
                            >
                                {property.about_project_config.button_text}
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <div className="container mx-auto px-4 max-w-4xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-8 text-white">Sobre el Proyecto</h2>
                <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {property.description}
                </p>
            </div>
        )}
      </section>

      <SectionSeparator />

      {/* Location Section */}
      <section id="location" className="py-20 bg-black relative overflow-hidden min-h-screen flex items-center">
         <div className="container mx-auto px-4 relative z-10 w-full">
            {/* Header */}
            <div className="mb-12">
                {property.location_config?.decorative_title && (
                    <span className="text-amber-500 font-monsieur text-2xl md:text-3xl block mb-2 tracking-wider">
                        {property.location_config.decorative_title}
                    </span>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                    <h2 className="text-4xl md:text-6xl font-cormorant font-light text-white uppercase leading-none">
                        {property.location_config?.title || "Project Location"}
                    </h2>
                    
                    {property.location_config?.description && (
                        <p className="text-gray-400 max-w-md text-sm md:text-base leading-relaxed font-light text-right md:text-left">
                            {property.location_config.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Map Container */}
            <div className="relative max-w-4xl mx-auto w-full h-[450px] md:h-[525px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
                 <ClientMap 
                    lat={property.location_config.lat} 
                    lng={property.location_config.lng} 
                    theme="dark"
                    zoom={property.location_config.zoom || 13}
                />
            </div>

            {/* Address Below Map */}
            <div className="max-w-4xl mx-auto mt-8 px-4 md:px-0">
                 <div className="flex items-center space-x-4 text-white/90">
                    <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20">
                        <MapPin className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="text-xl font-light tracking-wide text-gray-300">{property.location_config.address || 'Ubicación privilegiada'}</p>
                 </div>
            </div>
         </div>
      </section>

      {/* Floor Plans Section */}
      {property.typologies && property.typologies.length > 0 && <SectionSeparator />}
      <div id="tipologias" className="scroll-mt-24" />
      <FloorPlansSection typologies={property.typologies} config={property.typologies_config} />

      {/* Virtual Tour Section */}
      {property.virtual_tour_config && property.virtual_tour_config.enabled && (
        <>
          <SectionSeparator />
          <div id="tour-virtual" className="scroll-mt-24" />
          <VirtualTourSection config={property.virtual_tour_config} />
        </>
      )}

      {/* Amenities Section */}
      {property.amenities && property.amenities.length > 0 && (
          <>
            <SectionSeparator />
            <div id="amenidades" className="scroll-mt-24" />
            <AmenitiesSection amenities={property.amenities} />
          </>
      )}

      {/* Payment Schemes Section */}
      {property.payment_scheme_config && property.payment_scheme_config.enabled && (
          <>
            <SectionSeparator />
            <div id="esquemas-de-pago" className="scroll-mt-24" />
            <PaymentSchemesSection config={property.payment_scheme_config} />
          </>
      )}

      {/* Contact Section */}
      {property.contact_config && (
          <>
            <SectionSeparator />
            <div id="contacto" className="scroll-mt-24" />
            <ContactSection config={property.contact_config} propertyName={property.title} />
          </>
      )}




      {/* Footer */}
      {property.footer_config && property.footer_config.enabled ? (
        <FooterSection config={property.footer_config} />
      ) : (
        <footer className="bg-black py-12 border-t border-white/10">
            <div className="container mx-auto px-4 text-center text-gray-500">
                <p>&copy; {new Date().getFullYear()} {property.title}. Todos los derechos reservados.</p>
            </div>
        </footer>
      )}
    </div>
  );
}
