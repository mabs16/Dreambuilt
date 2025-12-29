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

export enum SlaStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('sla_jobs')
export class SlaJob {
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

  @Column({ default: 'CONTACT_SLA', nullable: true })
  type: string;

  @Column({ type: 'timestamptz', nullable: true })
  due_at: Date;

  @Column({ default: 0 })
  reassignment_count: number;

  @Column({
    type: 'enum',
    enum: SlaStatus,
    default: SlaStatus.PENDING,
  })
  status: SlaStatus;

  @CreateDateColumn()
  created_at: Date;
}
