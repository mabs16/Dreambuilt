import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { SlaJob } from '../entities/sla-job.entity';
export declare class SlaService {
    private readonly slaRepository;
    private slaQueue;
    private readonly logger;
    constructor(slaRepository: Repository<SlaJob>, slaQueue: Queue);
    createSla(leadId: number, advisorId: number, reassignmentCount?: number): Promise<SlaJob>;
    completeSla(leadId: number): Promise<void>;
    cancelSla(leadId: number): Promise<void>;
}
