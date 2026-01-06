import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Flow } from './flow.entity';

@Entity('flow_sessions')
export class FlowSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ nullable: true })
  lead_id: number;

  @ManyToOne(() => Flow)
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @Column({ nullable: true })
  flow_id: number;

  @Column({ nullable: true })
  current_node_id: string;

  @Column('jsonb', { default: {} })
  variables: Record<string, any>;

  @Column({ default: 'ACTIVE' }) // 'ACTIVE', 'COMPLETED', 'PAUSED'
  status: string;

  @CreateDateColumn()
  last_interaction: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_for: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
