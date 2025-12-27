import { Lead } from '../../leads/entities/lead.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';
export declare enum SlaStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare class SlaJob {
    id: string;
    lead_id: number;
    advisor_id: number;
    lead: Lead;
    advisor: Advisor;
    type: string;
    due_at: Date;
    reassignment_count: number;
    status: SlaStatus;
    created_at: Date;
}
