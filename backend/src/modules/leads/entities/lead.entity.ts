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
  ASESOR_INFORMADO = 'ASESOR_INFORMADO',
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

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  source: string;

  @Column({
    type: 'enum',
    enum: LeadStatus,
    default: LeadStatus.NUEVO,
  })
  status: LeadStatus;

  @Column({ nullable: true })
  avatar_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
