import { Lead } from './lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';
export declare class LeadNote {
    id: number;
    lead_id: number;
    lead: Lead;
    advisor_id: number;
    advisor: Advisor;
    content: string;
    type: string;
    created_at: Date;
}
