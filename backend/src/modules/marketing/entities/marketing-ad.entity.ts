import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marketing_ads')
export class MarketingAd {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  adset_name: string | null;

  @Column('text', { nullable: true })
  campaign_name: string | null;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  objective: string;

  @Column({ nullable: true })
  currency: string;

  // Fechas
  @Column({ type: 'date', nullable: true })
  creation_date: Date;

  @Column({ type: 'date', nullable: true })
  meta_date_start: Date;

  @Column({ type: 'date', nullable: true })
  meta_date_stop: Date;

  // Métricas Principales
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  spend: number;

  @Column('int', { default: 0 })
  impressions: number;

  @Column('int', { default: 0 })
  reach: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  frequency: number;

  @Column('int', { default: 0 })
  results: number;

  @Column({ nullable: true })
  result_indicator: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_result: number;

  @Column('int', { default: 0 })
  clicks_all: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  ctr_all: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cpc_all: number;

  @Column('int', { default: 0 })
  impressions_gross: number;

  // Interacción / Video / Web
  @Column('int', { default: 0 })
  landing_page_views: number;

  @Column('int', { default: 0 })
  link_clicks: number;

  @Column('int', { default: 0 })
  leads: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cpm: number;

  // Additional Columns
  @Column('int', { default: 0 })
  views: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  result_rate: number;

  @Column('int', { default: 0 })
  viewers: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_m_reached: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  link_click_result_rate: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  landing_page_view_rate: number;

  @Column('int', { default: 0 })
  post_comments: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_page_engagement: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_like: number;

  @Column('int', { default: 0 })
  page_engagement: number;

  @Column('int', { default: 0 })
  post_engagement: number;

  @Column('int', { default: 0 })
  post_reactions: number;

  @Column('int', { default: 0 })
  post_saves: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_engagement: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_post_engagement: number;

  @Column('int', { default: 0 })
  engagement_total: number;

  @Column('int', { default: 0 })
  fb_likes: number;

  @Column('int', { default: 0 })
  ig_follows: number;

  @Column('int', { default: 0 })
  post_shares: number;

  @Column('int', { default: 0 })
  messaging_contacts: number;

  @Column('int', { default: 0 })
  messaging_conversations_started: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_messaging_contact: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_messaging_conversation_started: number;

  @Column('int', { default: 0 })
  video_plays_3s: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_thruplay: number;

  @Column('int', { default: 0 })
  thruplays: number;

  @Column('int', { default: 0 })
  video_plays: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_video_play_3s: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  video_plays_3s_rate: number;

  @Column('int', { default: 0 })
  video_plays_100p: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  video_avg_time: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  outbound_clicks_unique_ctr: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  ctr_unique_link: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cpc_link: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_unique_click_all: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_outbound_click: number;

  @Column('int', { default: 0 })
  unique_clicks_all: number;

  @Column('int', { default: 0 })
  outbound_clicks: number;

  @Column('int', { default: 0 })
  unique_link_clicks: number;

  @Column('int', { default: 0 })
  unique_outbound_clicks: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_unique_outbound_click: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_unique_link_click: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  ctr_link: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  ctr_unique_all: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  outbound_clicks_ctr: number;

  @Column('int', { default: 0 })
  ig_profile_visits: number;

  @Column('int', { default: 0 })
  leads_meta: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_lead: number;

  @Column('int', { default: 0 })
  website_landing_page_visits: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_landing_page_visit: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_action_type_full_form: number;

  @Column('int', { default: 0 })
  full_form_typ: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
