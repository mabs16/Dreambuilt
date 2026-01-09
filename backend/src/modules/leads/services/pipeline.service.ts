import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadsService } from './leads.service';
import { LeadStateMachine } from './lead-state-machine.service';
import { LeadStatus } from '../entities/lead.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScoresService } from '../../scores/services/scores.service';
import { SlaService } from '../../sla/services/sla.service';

import { AssignmentsService } from '../../assignments/services/assignments.service';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly stateMachine: LeadStateMachine,
    private readonly eventEmitter: EventEmitter2,
    private readonly scoresService: ScoresService,
    private readonly slaService: SlaService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @OnEvent('command.contactado')
  async handleContactado(payload: { leadId: number; advisorId: number }) {
    await this.transitionLead(
      payload.leadId,
      payload.advisorId,
      LeadStatus.CONTACTADO,
    );

    // Complete SLA
    await this.slaService.completeSla(payload.leadId);

    // Scoring (+2 if within SLA, +1 if outside)
    // For v1 simulation, check if there's a failed SLA event
    const status = await this.eventEmitter.emitAsync(
      'sla.check_status',
      payload.leadId,
    );
    const points = status && status[0] === 'FAILED' ? 1 : 2;
    await this.scoresService.addScore(
      payload.advisorId,
      payload.leadId,
      points,
      'CONTACTADO',
    );
  }

  @OnEvent('command.cita')
  async handleCita(payload: { leadId: number; advisorId: number }) {
    await this.transitionLead(
      payload.leadId,
      payload.advisorId,
      LeadStatus.CITA,
    );
    await this.scoresService.addScore(
      payload.advisorId,
      payload.leadId,
      5,
      'CITA',
    );
  }

  @OnEvent('command.cierre')
  async handleCierre(payload: { leadId: number; advisorId: number }) {
    await this.transitionLead(
      payload.leadId,
      payload.advisorId,
      LeadStatus.CIERRE,
    );
    await this.scoresService.addScore(
      payload.advisorId,
      payload.leadId,
      10,
      'CIERRE',
    );
  }

  @OnEvent('command.seguimiento')
  async handleSeguimiento(payload: { leadId: number; advisorId: number }) {
    await this.transitionLead(
      payload.leadId,
      payload.advisorId,
      LeadStatus.SEGUIMIENTO,
    );
  }

  @OnEvent('command.descartado')
  async handleDescartado(payload: {
    leadId: number;
    advisorId: number;
    reason?: string;
  }) {
    await this.transitionLead(
      payload.leadId,
      payload.advisorId,
      LeadStatus.DESCARTADO,
    );

    // Si hay razón de descarte, actualizarla
    if (payload.reason) {
      // Necesitaría un método en LeadsService para esto, o usar updateStatus con partial
      // Por ahora asumimos que el servicio ya manejó la nota, pero si queremos guardar en la columna específica:
      // await this.leadsService.updateDisqualificationReason(payload.leadId, payload.reason);
      // Pero LeadsService no tiene ese método aún. Lo agregaré después.
    }

    // Emitir evento para posible flujo de nutrición
    this.eventEmitter.emit('lead.descartado', {
      leadId: payload.leadId,
      advisorId: payload.advisorId,
      reason: payload.reason,
    });
  }

  @OnEvent('command.intento_contacto')
  handleIntento(payload: { leadId: number; advisorId: number }) {
    this.eventEmitter.emit('event.created', {
      lead_id: payload.leadId,
      advisor_id: payload.advisorId,
      type: 'INTENTO_CONTACTO',
    });
  }

  @OnEvent('pipeline.assign')
  async handleAssign(payload: {
    leadId: number;
    advisorId: number;
    source?: 'SYSTEM' | 'MANUAL';
  }) {
    this.logger.log(
      `Handling assignment event for lead ${payload.leadId} to advisor ${payload.advisorId} (Source: ${payload.source || 'UNKNOWN'})`,
    );
    try {
      const assignment = await this.assignmentsService.createAssignment(
        payload.leadId,
        payload.advisorId,
        payload.source || 'SYSTEM', // Default to SYSTEM if coming from pipeline.assign without source?
        // Wait, if manual assignment emits pipeline.assign, it should pass source.
        // If AI emits pipeline.assign, it should pass source.
        // I will default to SYSTEM to be safe for existing calls, OR I should verify AI call.
      );
      this.logger.log(`Assignment created with ID: ${assignment.id}`);

      await this.transitionLead(
        payload.leadId,
        payload.advisorId,
        LeadStatus.ASIGNADO,
      );
      // Start SLA
      await this.slaService.createSla(payload.leadId, payload.advisorId);
    } catch (error) {
      this.logger.error(
        `Error in handleAssign: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async transitionLead(
    leadId: number,
    advisorId: number,
    nextStatus: LeadStatus,
  ) {
    const lead = await this.leadsService.findById(leadId);

    try {
      this.stateMachine.validateTransition(lead.status, nextStatus);
      await this.leadsService.updateStatus(leadId, nextStatus);

      this.eventEmitter.emit('event.created', {
        lead_id: leadId,
        advisor_id: advisorId,
        type: 'STATUS_CHANGE',
        payload: { from: lead.status, to: nextStatus },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed transition for lead ${leadId}: ${message}`);
      throw error;
    }
  }
}
