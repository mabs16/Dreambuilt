import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';

@Entity('assignments')
export class Assignment {
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

  @CreateDateColumn()
  assigned_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  ended_at: Date;

  @Column({ type: 'varchar', nullable: true, default: 'SYSTEM' })
  source: string;
}
