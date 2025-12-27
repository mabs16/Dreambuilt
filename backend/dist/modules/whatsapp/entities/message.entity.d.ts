import { Lead } from '../../leads/entities/lead.entity';
export declare enum MessageDirection {
    INBOUND = "inbound",
    OUTBOUND = "outbound"
}
export declare class Message {
    id: number;
    waId: string;
    from: string;
    to: string;
    body: string;
    direction: string;
    createdAt: Date;
    leadId: number;
    lead: Lead;
}
