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

    const dueAt = new Date(Date.now() + timeLimitMinutes * 60 * 1000);

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
        { delay: timeLimitMinutes * 60 * 1000, jobId: `sla-${savedJob.id}` },
      );
    } else {
      this.logger.warn(
        'SLA Queue not available. SLA job check will be skipped.',
      );
    }

    this.logger.log(
      `SLA created for lead ${leadId} assigned to advisor ${advisorId} (Limit: ${timeLimitMinutes} min)`,
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
        const minutesTaken = (now.getTime() - createdTime) / 1000 / 60;

        await this.scoresService.addScore(
          advisorId,
          leadId,
          2,
          `ON_TIME_RESPONSE (${minutesTaken.toFixed(1)}m)`,
        );
        this.logger.log(
          `Awarded points to advisor ${advisorId} for on-time response (${minutesTaken.toFixed(1)}m)`,
        );
      }

      await this.completeSla(leadId);
    }
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
