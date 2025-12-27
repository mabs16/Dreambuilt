import { Lead } from '../../leads/entities/lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';
export declare class Assignment {
    id: string;
    lead_id: number;
    advisor_id: number;
    lead: Lead;
    advisor: Advisor;
    assigned_at: Date;
    ended_at: Date;
}
