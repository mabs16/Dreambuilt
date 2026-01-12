export interface Property {
  id: string;
  title: string;
  slug: string;
  description: string;
  hero_config: {
    type: 'image' | 'video' | 'carousel';
    assets: { url: string; type: 'image' | 'video'; videoId?: string; device?: 'desktop' | 'mobile' }[];
    title?: string;
    subtitle?: string;
    decorative_title_1?: string;
    decorative_title_2?: string;
    show_header_title?: boolean;
    overlay_logo?: string;
  };
  location_config: {
    lat: number;
    lng: number;
    address: string;
    mapType?: 'google' | 'leaflet';
  };
  typologies: {
    id: string;
    name: string;
    description?: string;
    image_url: string;
  }[];
  virtual_tour_config: {
    enabled: boolean;
    type: 'embed' | 'video';
    content: string;
  };
  amenities: {
    id: string;
    name: string;
    image_url?: string;
    icon?: string;
  }[];
  contact_config: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    call_to_action_text?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/api`;

export const PropertiesService = {
  async findAll(): Promise<Property[]> {
    const res = await fetch(`${API_URL}/properties`);
    if (!res.ok) throw new Error('Failed to fetch properties');
    return res.json();
  },

  async findOne(id: string): Promise<Property> {
    const res = await fetch(`${API_URL}/properties/${id}`);
    if (!res.ok) throw new Error('Failed to fetch property');
    return res.json();
  },

  async findBySlug(slug: string): Promise<Property> {
    const res = await fetch(`${API_URL}/properties/slug/${slug}`);
    if (!res.ok) throw new Error('Failed to fetch property');
    return res.json();
  },

  async create(data: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_URL}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create property');
    return res.json();
  },

  async update(id: string, data: Partial<Property>): Promise<Property> {
    const res = await fetch(`${API_URL}/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update property');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/properties/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete property');
  },

  async uploadFile(file: File): Promise<{ url: string; type: 'image' | 'document' }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/storage/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  async uploadVideo(file: File): Promise<{ videoId: string; url: string; type: 'video' }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/storage/upload/video`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload video');
    return res.json();
  },

  async deleteVideo(videoId: string): Promise<void> {
    const res = await fetch(`${API_URL}/storage/delete/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
    });
    if (!res.ok) console.error('Failed to delete video from storage, but continuing...');
  },
};
