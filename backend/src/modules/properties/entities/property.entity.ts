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
    assets: {
      url: string;
      type: 'image' | 'video';
      videoId?: string;
      device?: 'desktop' | 'mobile'; // Added device support
    }[];
    title?: string;
    subtitle?: string;
    decorative_title_1?: string;
    decorative_title_2?: string;
    show_header_title?: boolean;
    overlay_logo?: string;
  };

  // About Project Configuration
  @Column('jsonb', { default: {} })
  about_project_config: {
    enabled: boolean;
    image_url?: string;
    decorative_title?: string;
    title?: string;
    description?: string;
    button_text?: string;
    button_link?: string;
  };

  // Location Configuration
  @Column('jsonb', { default: {} })
  location_config: {
    lat: number;
    lng: number;
    zoom?: number;
    address: string;
    mapType?: 'google' | 'leaflet';
    decorative_title?: string;
    title?: string;
    description?: string;
  };

  // Typologies Configuration
  @Column('jsonb', { nullable: true, default: {} })
  typologies_config?: {
    decorative_title?: string;
    title?: string;
    description?: string;
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
    decorative_title?: string;
    title?: string;
    description?: string;
    tour_embed?: string;
    videos?: {
      id: string;
      url: string;
      thumbnail_url?: string;
      title?: string;
      orientation?: 'landscape' | 'portrait';
    }[];
  };

  // Amenities
  @Column('jsonb', { default: [] })
  amenities: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    icon?: string;
  }[];

  // Payment Schemes Configuration
  @Column('jsonb', { nullable: true, default: {} })
  payment_scheme_config?: {
    enabled: boolean;
    decorative_title?: string;
    title?: string;
    subtitle?: string;
    footer_title?: string;
    footer_text?: string;
    schemes: {
      id: string;
      down_payment: string;
      construction_payment: string;
      delivery_payment: string;
      discount: string;
    }[];
  };

  // Contact Configuration
  @Column('jsonb', { default: {} })
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

  // Footer Configuration
  @Column('jsonb', { nullable: true, default: {} })
  footer_config?: {
    enabled: boolean;
    logo_url?: string;
    description?: string;
    copyright_text?: string;
    disclaimer_text?: string;
    social_links?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      youtube?: string;
    };
    contact_info?: {
      address?: string;
      email?: string;
      phone?: string;
    };
    links?: {
      label: string;
      url: string;
    }[];
  };

  // General Status
  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
