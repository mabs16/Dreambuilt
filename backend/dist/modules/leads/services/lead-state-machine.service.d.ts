import { LeadStatus } from '../entities/lead.entity';
export declare class LeadStateMachine {
    private readonly transitions;
    validateTransition(current: LeadStatus, next: LeadStatus): void;
}
