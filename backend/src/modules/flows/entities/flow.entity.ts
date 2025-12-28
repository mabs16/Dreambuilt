import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('flows')
export class Flow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('text', { array: true, default: [] })
  trigger_keywords: string[];

  @Column('jsonb', { default: [] })
  nodes: any[];

  @Column('jsonb', { default: [] })
  edges: any[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
