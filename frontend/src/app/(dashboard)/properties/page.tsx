'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Edit, Trash, Eye, Building } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { PropertiesService, Property } from '@/services/properties.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProperties = async () => {
    try {
      const data = await PropertiesService.findAll();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta propiedad?')) {
      try {
        await PropertiesService.delete(id);
        fetchProperties();
      } catch {
        alert('Error al eliminar');
      }
    }
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location_config?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Propiedades</h1>
          <p className="text-gray-400 mt-1">Gestiona las landing pages de tus desarrollos</p>
        </div>
        <Link 
          href="/properties/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-lg shadow-blue-900/20 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Propiedad
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o dirección..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <Building className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg">No hay propiedades encontradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-white/20 transition-all">
              {/* Image Preview */}
              <div className="h-48 bg-black/40 relative">
                {property.hero_config?.assets?.[0]?.url ? (
                  property.hero_config.assets[0].type === 'video' ? (
                     <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <span className="text-xs text-gray-400">Video Cover</span>
                     </div>
                  ) : (
                    <Image 
                        src={property.hero_config.assets[0].url} 
                        alt={property.title}
                        fill
                        className="object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/properties/${property.id}`} className="p-2 bg-black/60 rounded-lg text-white hover:bg-blue-600 transition-colors">
                        <Edit className="w-4 h-4" />
                    </Link>
                    <button onClick={() => handleDelete(property.id)} className="p-2 bg-black/60 rounded-lg text-white hover:bg-red-600 transition-colors">
                        <Trash className="w-4 h-4" />
                    </button>
                </div>

                <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${property.is_active ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>
                    {property.is_active ? 'Activa' : 'Borrador'}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-white mb-1 truncate">{property.title}</h3>
                <div className="flex items-center text-gray-400 text-sm mb-4">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="truncate">{property.location_config?.address || 'Sin dirección'}</span>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-white/5">
                  <span>Actualizado: {format(new Date(property.updated_at), 'd MMM yyyy', { locale: es })}</span>
                  <Link href={`/${property.slug}`} target="_blank" className="flex items-center text-blue-400 hover:text-blue-300">
                    Ver Landing <Eye className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
