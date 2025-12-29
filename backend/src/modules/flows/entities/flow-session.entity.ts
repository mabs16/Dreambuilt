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

  @Column()
  lead_id: number;

  @ManyToOne(() => Flow)
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @Column()
  flow_id: number;

  @Column()
  current_node_id: string;

  @Column('jsonb', { default: {} })
  variables: Record<string, any>;

  @Column({ default: 'ACTIVE' }) // 'ACTIVE', 'COMPLETED', 'PAUSED'
  status: string;

  @CreateDateColumn()
  last_interaction: Date;

  @CreateDateColumn()
  created_at: Date;
}
