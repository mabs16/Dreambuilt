import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from '../../leads/entities/lead.entity';

export enum MessageDirection {
    INBOUND = 'inbound',
    OUTBOUND = 'outbound',
}

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'wa_id', nullable: true })
    waId: string; // WhatsApp Message ID from Meta

    @Column()
    from: string;

    @Column()
    to: string;

    @Column('text')
    body: string;

    @Column({
        name: 'direction',
        type: 'varchar',
        default: 'inbound',
    })
    direction: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'lead_id', nullable: true })
    leadId: number;

    @ManyToOne(() => Lead, { nullable: true })
    @JoinColumn({ name: 'lead_id' })
    lead: Lead;
}
