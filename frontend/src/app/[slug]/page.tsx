import { notFound } from 'next/navigation';
import Image from 'next/image';
import { PropertiesService } from '@/services/properties.service';
import LandingNavbar from './components/LandingNavbar';
import FloorPlansSection from './components/FloorPlansSection';
import VirtualTourSection from './components/VirtualTourSection';
import AmenitiesSection from './components/AmenitiesSection';
import PaymentSchemesSection from './components/PaymentSchemesSection';
import ContactSection from './components/ContactSection';
import SectionSeparator from './components/SectionSeparator';
import FooterSection from './components/FooterSection';
import HeroVideo from './components/HeroVideo';
import HeroContent from './components/HeroContent';
import AboutProjectSection from './components/AboutProjectSection';
import LocationSection from './components/LocationSection';

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
        <HeroContent 
          config={property.hero_config} 
          defaultSubtitle={property.description} 
        />



      </section>

      <SectionSeparator />

      {/* About Project Section */}
      <AboutProjectSection 
          config={property.about_project_config} 
          defaultDescription={property.description} 
      />

      <SectionSeparator />

      {/* Location Section */}
      <LocationSection config={property.location_config} />

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
            <AmenitiesSection 
                amenities={property.amenities} 
                config={property.amenities_config}
            />
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
