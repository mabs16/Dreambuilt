import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { AdvisorsService } from '../../advisors/services/advisors.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    private readonly advisorsService: AdvisorsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findActiveAssignment(leadId: number): Promise<Assignment | null> {
    return this.assignmentsRepository.findOne({
      where: { lead_id: leadId, ended_at: IsNull() },
    });
  }

  async reassign(
    leadId: number,
    oldAdvisorId: number,
    count: number,
  ): Promise<void> {
    // 1. Close active assignment
    const active = await this.findActiveAssignment(leadId);
    if (active) {
      active.ended_at = new Date();
      await this.assignmentsRepository.save(active);
    }

    this.logger.log(
      `Reassigning lead ${leadId} from ${oldAdvisorId} (attempt ${count})`,
    );

    // 2. Find new advisor (excluding the old one)
    const allAdvisors = await this.advisorsService.findAll();
    const candidates = allAdvisors.filter(
      (a) => Number(a.id) !== Number(oldAdvisorId),
    );

    if (candidates.length === 0) {
      this.logger.warn(
        `No other advisors available to reassign lead ${leadId}. Leaving unassigned.`,
      );
      return;
    }

    // Simple strategy: Pick the first available candidate
    // In future: Implement Round Robin or Load Balancing
    const newAdvisor = candidates[0];

    // 3. Create new assignment
    await this.createAssignment(leadId, newAdvisor.id, 'REASSIGNMENT');

    this.logger.log(
      `Lead ${leadId} reassigned to Advisor ${newAdvisor.id} (${newAdvisor.name})`,
    );

    // 4. Emit Reassignment Event for Notifications
    this.eventEmitter.emit('assignment.reassigned', {
      leadId,
      advisorId: newAdvisor.id,
      oldAdvisorId,
      advisorName: newAdvisor.name,
      advisorPhone: newAdvisor.phone,
    });
  }

  async createAssignment(
    leadId: number,
    advisorId: number,
    source: 'SYSTEM' | 'MANUAL' | 'REASSIGNMENT' | 'PULL' = 'MANUAL',
  ): Promise<Assignment> {
    this.logger.log(
      `Creating assignment for lead ${leadId} -> advisor ${advisorId} (Source: ${source})`,
    );
    try {
      const assignment = this.assignmentsRepository.create({
        lead_id: leadId,
        advisor_id: advisorId,
        source: source,
      });
      const saved = await this.assignmentsRepository.save(assignment);
      this.logger.log(
        `Assignment saved successfully: ${JSON.stringify(saved)}`,
      );

      this.eventEmitter.emit('assignment.created', {
        assignment: saved,
        source,
      });

      return saved;
    } catch (error) {
      this.logger.error(`Failed to create assignment: ${error}`);
      throw error;
    }
  }
}
