import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Advisor } from '../../advisors/entities/advisor.entity';
import { Lead } from '../../leads/entities/lead.entity';

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', nullable: true })
  advisor_id: number;

  @Column({ type: 'bigint', nullable: true })
  lead_id: number;

  @ManyToOne(() => Advisor)
  @JoinColumn({ name: 'advisor_id' })
  advisor: Advisor;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ nullable: true })
  points: number;

  @Column({ nullable: true })
  reason: string;

  @CreateDateColumn()
  created_at: Date;
}
