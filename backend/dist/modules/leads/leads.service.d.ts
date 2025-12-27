import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { LeadNote } from './entities/lead-note.entity';
export declare class LeadsService {
    private readonly leadsRepository;
    private readonly notesRepository;
    constructor(leadsRepository: Repository<Lead>, notesRepository: Repository<LeadNote>);
    findById(id: number): Promise<Lead>;
    findByPhone(phone: string): Promise<Lead | null>;
    createLead(data: {
        name: string;
        phone: string;
        source: string;
    }): Promise<Lead>;
    updateStatus(id: number, status: LeadStatus): Promise<Lead>;
    updateName(id: number, name: string): Promise<Lead>;
    freezeForManualReview(): Promise<void>;
    addNote(data: {
        leadId: number;
        advisorId?: number;
        content: string;
        type?: string;
    }): Promise<LeadNote>;
    getNotes(leadId: number): Promise<LeadNote[]>;
}
