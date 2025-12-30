import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SlaJob, SlaStatus } from '../entities/sla-job.entity';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaJob)
    private readonly slaRepository: Repository<SlaJob>,
    @InjectQueue('sla-queue') private slaQueue: Queue,
  ) {}

  async createSla(
    leadId: number,
    advisorId: number,
    reassignmentCount = 0,
  ): Promise<SlaJob> {
    const dueAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

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
    await this.slaQueue.add(
      'check-sla',
      { slaJobId: savedJob.id, leadId, advisorId },
      { delay: 15 * 60 * 1000, jobId: `sla-${savedJob.id}` },
    );

    this.logger.log(
      `SLA created for lead ${leadId} assigned to advisor ${advisorId}`,
    );
    return savedJob;
  }

  async completeSla(leadId: number): Promise<void> {
    const pendingJob = await this.slaRepository.findOne({
      where: { lead_id: leadId, status: SlaStatus.PENDING },
    });

    if (pendingJob) {
      pendingJob.status = SlaStatus.COMPLETED;
      await this.slaRepository.save(pendingJob);

      // Remove from BullMQ queue if possible
      const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
      if (job) await job.remove();

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
      const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
      if (job) await job.remove();
    }
  }
}
