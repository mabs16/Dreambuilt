import { Advisor } from '../../advisors/entities/advisor.entity';
import { Lead } from '../../leads/entities/lead.entity';
export declare class Score {
    id: string;
    advisor_id: number;
    lead_id: number;
    advisor: Advisor;
    lead: Lead;
    points: number;
    reason: string;
    created_at: Date;
}
