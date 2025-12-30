import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlaJob, SlaStatus } from '../entities/sla-job.entity';
import { LeadsService } from '../../leads/services/leads.service';
import { AssignmentsService } from '../../assignments/services/assignments.service';
import { ScoresService } from '../../scores/services/scores.service';
import { LeadStatus } from '../../leads/entities/lead.entity';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WhatsappService } from '../../whatsapp/services/whatsapp.service';
import { AdvisorsService } from '../../advisors/services/advisors.service';
import { AutomationsService } from '../../whatsapp/services/automations.service';
import { AdvisorAutomationConfig } from '../../whatsapp/entities/automation.entity';

@Processor('sla-queue', {
  lockDuration: 300000, // 5 minutos
  stalledInterval: 300000, // 5 minutos
  maxStalledCount: 1,
})
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(
    @InjectRepository(SlaJob)
    private readonly slaRepository: Repository<SlaJob>,
    private readonly leadsService: LeadsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly scoresService: ScoresService,
    private readonly eventEmitter: EventEmitter2,
    private readonly whatsappService: WhatsappService,
    private readonly advisorsService: AdvisorsService,
    private readonly automationsService: AutomationsService,
  ) {
    super();
  }

  async process(
    job: Job<
      { slaJobId: string; leadId: number; advisorId: number },
      any,
      string
    >,
  ): Promise<any> {
    if (job.name === 'check-sla') {
      const { slaJobId, leadId, advisorId } = job.data;
      const slaJob = await this.slaRepository.findOne({
        where: { id: slaJobId },
      });

      if (!slaJob || slaJob.status !== SlaStatus.PENDING) return;

      const lead = await this.leadsService.findById(leadId);

      // Rule: SLA fails if status != CONTACTADO (or advanced)
      if (lead.status === LeadStatus.ASIGNADO) {
        this.logger.warn(
          `SLA Failed for lead ${leadId} (Advisor ${advisorId})`,
        );

        slaJob.status = SlaStatus.FAILED;
        await this.slaRepository.save(slaJob);

        // Get custom message if configured
        const automation =
          await this.automationsService.getConfig('advisor_automation');
        const advisorConfig = automation?.config as AdvisorAutomationConfig;

        let message = `⚠️ *ALERTA DE SLA*: Han pasado 15 minutos sin contacto con el Lead #${leadId} (${lead.name}).\n\nEl lead será reasignado y tu puntuación ha sido penalizada. 📉`;

        if (advisorConfig?.slaWarningMessage) {
          message = advisorConfig.slaWarningMessage
            .replace(/\{\{lead_id\}\}/g, String(leadId))
            .replace(/\{\{lead_name\}\}/g, lead.name);
        }

        // Notify advisor via WhatsApp about SLA failure
        const advisor = await this.advisorsService.findById(advisorId);
        if (advisor) {
          await this.whatsappService.sendWhatsappMessage(
            advisor.phone,
            message,
          );
        }

        // Check for contact attempts (INTENTO_CONTACTO) in events
        const hasAttempts = (await this.eventEmitter.emitAsync(
          'event.validate_attempts',
          { leadId, advisorId },
        )) as boolean[];
        const penalty = hasAttempts && hasAttempts[0] ? -2 : -5;

        // Apply Penalty Score
        await this.scoresService.addScore(
          advisorId,
          leadId,
          penalty,
          'SLA_FAILED',
        );

        // Trigger Reassignment logic if count < 2
        if (slaJob.reassignment_count < 2) {
          await this.assignmentsService.reassign(
            leadId,
            advisorId,
            slaJob.reassignment_count + 1,
          );
        } else {
          // Freeze lead for manual review
          await this.leadsService.freezeForManualReview();
        }

        // Notify events
        this.eventEmitter.emit('event.created', {
          lead_id: leadId,
          advisor_id: advisorId,
          type: 'SLA_FAILED',
          payload: {
            reason: 'NO_ATENDIDO',
            attempt_count: hasAttempts && hasAttempts[0] ? 1 : 0,
          },
        });
      }
    }
  }
}
