'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PropertyWizard from '../components/PropertyWizard';
import { PropertiesService, Property } from '@/services/properties.service';
import { Loader2 } from 'lucide-react';

export default function EditPropertyPage() {
  const params = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
        PropertiesService.findOne(params.id as string)
            .then(setProperty)
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  );

  if (!property) return <div>No se encontró la propiedad</div>;

  return <PropertyWizard initialData={property} isEditing />;
}
