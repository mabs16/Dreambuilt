import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from './lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';

@Entity('lead_notes')
export class LeadNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  lead_id: number;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'bigint', nullable: true })
  advisor_id: number;

  @ManyToOne(() => Advisor)
  @JoinColumn({ name: 'advisor_id' })
  advisor: Advisor;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', nullable: true })
  type: string; // e.g., 'MANUAL', 'STATUS_CHANGE', 'SYSTEM'

  @CreateDateColumn()
  created_at: Date;
}
