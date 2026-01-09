import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('advisors')
export class Advisor {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 'unavailable' })
  status: string; // 'available' | 'unavailable'

  @Column({ type: 'timestamptz', nullable: true })
  availability_started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  availability_expires_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
