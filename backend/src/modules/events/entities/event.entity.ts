import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', nullable: true })
  lead_id: number;

  @Column({ type: 'bigint', nullable: true })
  advisor_id: number;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @ManyToOne(() => Advisor)
  @JoinColumn({ name: 'advisor_id' })
  advisor: Advisor;

  @Column({ nullable: true })
  type: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
