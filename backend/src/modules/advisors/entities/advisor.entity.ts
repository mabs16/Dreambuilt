import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('advisors')
export class Advisor {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    phone: string;

    @Column({ default: 0 })
    score: number;

    @CreateDateColumn()
    created_at: Date;
}
