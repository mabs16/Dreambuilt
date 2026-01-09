import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('marketing_campaigns')
export class MarketingCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  status: string;

  @Column({ nullable: true })
  objective: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  spend: number;

  @Column('int', { default: 0 })
  impressions: number;

  @Column('int', { default: 0 })
  clicks: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  ctr: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cpc: number;

  @Column('int', { default: 0 })
  results: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  cost_per_result: number;

  @Column('int', { default: 0 })
  reach: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'date', nullable: true })
  meta_date_start: Date;

  @Column({ type: 'date', nullable: true })
  meta_date_stop: Date;
}
