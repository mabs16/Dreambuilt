import { LeadsService } from '../leads.service';
import { LeadStateMachine } from './lead-state-machine.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScoresService } from '../../scores/scores.service';
import { SlaService } from '../../sla/services/sla.service';
export declare class PipelineService {
    private readonly leadsService;
    private readonly stateMachine;
    private readonly eventEmitter;
    private readonly scoresService;
    private readonly slaService;
    private readonly logger;
    constructor(leadsService: LeadsService, stateMachine: LeadStateMachine, eventEmitter: EventEmitter2, scoresService: ScoresService, slaService: SlaService);
    handleContactado(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handleCita(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handleCierre(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handleSeguimiento(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handlePerdido(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handleIntento(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    handleAssign(payload: {
        leadId: number;
        advisorId: number;
    }): Promise<void>;
    private transitionLead;
}
