import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LeadStatus {
  NUEVO = 'NUEVO',
  PRECALIFICADO = 'PRECALIFICADO',
  ASIGNADO = 'ASIGNADO',
  CONTACTADO = 'CONTACTADO',
  CITA = 'CITA',
  SEGUIMIENTO = 'SEGUIMIENTO',
  CIERRE = 'CIERRE',
  PERDIDO = 'PERDIDO',
}

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  source: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NUEVO,
  })
  status: LeadStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
