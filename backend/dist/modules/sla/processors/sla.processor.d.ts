import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { SlaJob } from '../entities/sla-job.entity';
import { LeadsService } from '../../leads/leads.service';
import { AssignmentsService } from '../../assignments/assignments.service';
import { ScoresService } from '../../scores/scores.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';
import { AdvisorsService } from '../../advisors/advisors.service';
import { AutomationsService } from '../../whatsapp/services/automations.service';
export declare class SlaProcessor extends WorkerHost {
    private readonly slaRepository;
    private readonly leadsService;
    private readonly assignmentsService;
    private readonly scoresService;
    private readonly eventEmitter;
    private readonly whatsappService;
    private readonly advisorsService;
    private readonly automationsService;
    private readonly logger;
    constructor(slaRepository: Repository<SlaJob>, leadsService: LeadsService, assignmentsService: AssignmentsService, scoresService: ScoresService, eventEmitter: EventEmitter2, whatsappService: WhatsappService, advisorsService: AdvisorsService, automationsService: AutomationsService);
    process(job: Job<{
        slaJobId: string;
        leadId: number;
        advisorId: number;
    }, any, string>): Promise<any>;
}
