import {
  Injectable,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SlaJob, SlaStatus } from '../entities/sla-job.entity';
import { AutomationsService } from '../../whatsapp/services/automations.service';
import { AdvisorAutomationConfig } from '../../whatsapp/entities/automation.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { ScoresService } from '../../scores/services/scores.service';
import { addMinutes, set, isAfter, isBefore, addDays } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeadsService } from '../../leads/services/leads.service';
import { LeadStatus } from '../../leads/entities/lead.entity';
import { AssignmentsService } from '../../assignments/services/assignments.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaJob)
    private readonly slaRepository: Repository<SlaJob>,
    private readonly automationsService: AutomationsService,
    @Optional() @InjectQueue('sla-queue') private slaQueue: Queue,
    @Inject(forwardRef(() => ScoresService))
    private readonly scoresService: ScoresService,
    @Inject(forwardRef(() => LeadsService))
    private readonly leadsService: LeadsService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  async createSla(
    leadId: number,
    advisorId: number,
    reassignmentCount = 0,
  ): Promise<SlaJob> {
    // Get dynamic time limit from config
    let timeLimitMinutes = 15;
    try {
      const automation =
        await this.automationsService.getConfig('advisor_automation');
      if (automation && automation.config) {
        const config = automation.config as AdvisorAutomationConfig;
        if (
          config.responseTimeLimitMinutes &&
          config.responseTimeLimitMinutes > 0
        ) {
          timeLimitMinutes = config.responseTimeLimitMinutes;
        }
      }
    } catch (e) {
      this.logger.warn(
        `Failed to fetch advisor automation config, using default 15min SLA: ${e.message}`,
      );
    }

    const now = new Date();
    let dueAt = addMinutes(now, timeLimitMinutes);
    let delay = timeLimitMinutes * 60 * 1000;

    // NIGHT MODE CHECK (10 PM - 8 AM)
    // 10 PM = 22:00, 8 AM = 08:00
    const nightStart = set(now, { hours: 22, minutes: 0, seconds: 0 });
    const morningStart = set(now, { hours: 8, minutes: 0, seconds: 0 });

    if (isAfter(now, nightStart)) {
      // It's after 10 PM, set to tomorrow 9:15 AM
      const tomorrowMorning = set(addDays(now, 1), {
        hours: 9,
        minutes: 15,
        seconds: 0,
      });
      dueAt = tomorrowMorning;
      delay = dueAt.getTime() - now.getTime();
      this.logger.log(
        `🌙 Night Mode: SLA for Lead ${leadId} deferred to tomorrow 9:15 AM`,
      );
    } else if (isBefore(now, morningStart)) {
      // It's before 8 AM, set to today 9:15 AM
      const todayMorning = set(now, { hours: 9, minutes: 15, seconds: 0 });
      dueAt = todayMorning;
      delay = dueAt.getTime() - now.getTime();
      this.logger.log(
        `🌙 Night Mode: SLA for Lead ${leadId} deferred to today 9:15 AM`,
      );
    }

    // Save to DB for audit
    const slaJob = this.slaRepository.create({
      lead_id: leadId,
      advisor_id: advisorId,
      due_at: dueAt,
      reassignment_count: reassignmentCount,
      status: SlaStatus.PENDING,
    });

    const savedJob = await this.slaRepository.save(slaJob);

    // Add to BullMQ with delay
    if (this.slaQueue) {
      await this.slaQueue.add(
        'check-sla',
        { slaJobId: savedJob.id, leadId, advisorId },
        { delay, jobId: `sla-${savedJob.id}` },
      );
    } else {
      this.logger.warn(
        'SLA Queue not available. SLA job check will be skipped.',
      );
    }

    this.logger.log(
      `SLA created for lead ${leadId} assigned to advisor ${advisorId} (Due: ${dueAt.toISOString()})`,
    );
    return savedJob;
  }

  @OnEvent('command.contactado')
  async handleContactedEvent(payload: { leadId: number; advisorId: number }) {
    const { leadId, advisorId } = payload;
    const pendingJob = await this.slaRepository.findOne({
      where: { lead_id: leadId, status: SlaStatus.PENDING },
    });

    if (pendingJob) {
      const now = new Date();
      // Check if within SLA (due_at)
      if (pendingJob.due_at && now <= pendingJob.due_at) {
        // Calculate minutes taken for logging
        const createdTime = pendingJob.created_at.getTime();

        let startTime = createdTime;
        const morningStart = set(now, { hours: 9, minutes: 0, seconds: 0 });

        // If job was created way before 9 AM (night mode), start counting from 9 AM
        const isDeferred =
          pendingJob.due_at.getTime() - createdTime > 60 * 60 * 1000;

        if (isDeferred && isAfter(now, morningStart)) {
          // If it's after 9 AM, count from 9 AM
          startTime = morningStart.getTime();
        }

        const minutesTaken = (now.getTime() - startTime) / 1000 / 60;
        const effectiveMinutes = Math.max(0, minutesTaken);

        if (effectiveMinutes <= 5) {
          await this.scoresService.addScore(
            advisorId,
            leadId,
            2,
            `SPEED_FLASH (<5m)`,
          );
        } else if (effectiveMinutes <= 10) {
          await this.scoresService.addScore(
            advisorId,
            leadId,
            1,
            `SPEED_NORMAL (5-10m)`,
          );
        } else {
          // No penalty for >10m contact, just no bonus.
          // User clarification: "Resp. Lenta" penalty applies to rejection only.
          this.logger.log(
            `Advisor ${advisorId} contacted lead ${leadId} in ${effectiveMinutes.toFixed(
              1,
            )}m (No bonus)`,
          );
        }

        this.logger.log(
          `Scored advisor ${advisorId} for response time (${effectiveMinutes.toFixed(
            1,
          )}m)`,
        );
      }

      await this.completeSla(leadId);
    }
  }

  @OnEvent('command.reject')
  async handleRejectEvent(payload: { leadId: number; advisorId: number }) {
    const { leadId, advisorId } = payload;
    const assignment =
      await this.assignmentsService.findActiveAssignment(leadId);

    if (!assignment || Number(assignment.advisor_id) !== Number(advisorId)) {
      return;
    }

    const now = new Date();
    const diffMinutes =
      (now.getTime() - assignment.assigned_at.getTime()) / 1000 / 60;

    if (diffMinutes >= 5) {
      await this.scoresService.addScore(
        advisorId,
        leadId,
        -2,
        'REJECTED_LATE (>=5m)',
      );
    } else {
      this.logger.log(
        `Advisor ${advisorId} rejected lead ${leadId} quickly (<5m). No penalty.`,
      );
    }

    // Mark current SLA as FAILED/REJECTED
    const slaJob = await this.slaRepository.findOne({
      where: { lead_id: leadId, status: SlaStatus.PENDING },
    });

    let count = 1;
    if (slaJob) {
      count = slaJob.reassignment_count + 1;
      slaJob.status = SlaStatus.FAILED;
      await this.slaRepository.save(slaJob);

      if (this.slaQueue) {
        const job = await this.slaQueue.getJob(`sla-${slaJob.id}`);
        if (job) await job.remove();
      }
    }

    await this.assignmentsService.reassign(leadId, advisorId, count);
  }

  @OnEvent('assignment.reassigned')
  async handleReassignmentEvent(payload: {
    leadId: number;
    advisorId: number;
    oldAdvisorId: number;
  }) {
    // Create SLA for the new advisor
    const lastSla = await this.slaRepository.findOne({
      where: { lead_id: payload.leadId, advisor_id: payload.oldAdvisorId },
      order: { created_at: 'DESC' },
    });
    const count = lastSla ? lastSla.reassignment_count + 1 : 1;
    await this.createSla(payload.leadId, payload.advisorId, count);
  }

  async completeSla(leadId: number): Promise<void> {
    const pendingJob = await this.slaRepository.findOne({
      where: { lead_id: leadId, status: SlaStatus.PENDING },
    });

    if (pendingJob) {
      pendingJob.status = SlaStatus.COMPLETED;
      await this.slaRepository.save(pendingJob);

      // Remove from BullMQ queue if possible
      if (this.slaQueue) {
        const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
        if (job) await job.remove();
      }

      this.logger.log(`SLA completed for lead ${leadId}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkFollowUpSla() {
    this.logger.log('Running 72h Follow-up SLA Check...');
    const leads = await this.leadsService.findLeadsWithNoNotesSince(72, [
      LeadStatus.CONTACTADO,
      LeadStatus.CITA,
      LeadStatus.SEGUIMIENTO,
    ]);

    for (const lead of leads) {
      const assignment = await this.assignmentsService.findActiveAssignment(
        lead.id,
      );
      if (assignment) {
        // Check if already penalized recently (e.g. within 24h) to avoid spamming
        const lastPenalty = await this.scoresService.getLatestScoreByReason(
          assignment.advisor_id,
          lead.id,
          'SLA_LACK_OF_FOLLOWUP (72h Inactivity)',
        );

        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000,
        );

        if (!lastPenalty || lastPenalty.created_at < twentyFourHoursAgo) {
          await this.scoresService.addScore(
            assignment.advisor_id,
            lead.id,
            -20,
            'SLA_LACK_OF_FOLLOWUP (72h Inactivity)',
          );
          this.logger.warn(
            `Applied -20 penalty to advisor ${assignment.advisor_id} for lead ${lead.id} inactivity.`,
          );
        }
      }
    }
  }

  async cancelSla(leadId: number): Promise<void> {
    const pendingJob = await this.slaRepository.findOne({
      where: { lead_id: leadId, status: SlaStatus.PENDING },
    });

    if (pendingJob) {
      pendingJob.status = SlaStatus.COMPLETED; // Using COMPLETED as "don't process"
      await this.slaRepository.save(pendingJob);
      if (this.slaQueue) {
        const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
        if (job) await job.remove();
      }
    }
  }
}
