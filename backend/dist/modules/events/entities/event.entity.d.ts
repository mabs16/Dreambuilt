import { Lead } from '../../leads/entities/lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';
export declare class Event {
    id: string;
    lead_id: number;
    advisor_id: number;
    lead: Lead;
    advisor: Advisor;
    type: string;
    payload: any;
    created_at: Date;
}
