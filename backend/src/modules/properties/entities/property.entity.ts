import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('text', { nullable: true })
  description: string;

  // Hero Section Configuration
  @Column('jsonb', { default: {} })
  hero_config: {
    type: 'image' | 'video' | 'carousel';
    assets: { url: string; type: 'image' | 'video'; videoId?: string }[];
    title?: string;
    subtitle?: string;
  };

  // Location Configuration
  @Column('jsonb', { default: {} })
  location_config: {
    lat: number;
    lng: number;
    address: string;
    mapType?: 'google' | 'leaflet';
  };

  // Typologies / Floor Plans
  @Column('jsonb', { default: [] })
  typologies: {
    id: string;
    name: string;
    description?: string;
    image_url: string;
  }[];

  // Virtual Tour Configuration
  @Column('jsonb', { default: {} })
  virtual_tour_config: {
    enabled: boolean;
    type: 'embed' | 'video';
    content: string; // Embed code or Video URL
  };

  // Amenities
  @Column('jsonb', { default: [] })
  amenities: {
    id: string;
    name: string;
    image_url?: string;
    icon?: string;
  }[];

  // Contact Configuration
  @Column('jsonb', { default: {} })
  contact_config: {
    email?: string;
    phone?: string;
    whatsapp?: string;
  };

  // General Status
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
