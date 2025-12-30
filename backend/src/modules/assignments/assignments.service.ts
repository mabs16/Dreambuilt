import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Assignment } from './entities/assignment.entity';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
  ) {}

  async findActiveAssignment(leadId: number): Promise<Assignment | null> {
    return this.assignmentsRepository.findOne({
      where: { lead_id: leadId, ended_at: IsNull() },
    });
  }

  async reassign(leadId: number, oldAdvisorId: number, count: number) {
    // 1. Close active assignment
    const active = await this.findActiveAssignment(leadId);
    if (active) {
      active.ended_at = new Date();
      await this.assignmentsRepository.save(active);
    }

    this.logger.log(
      `Reassigning lead ${leadId} from ${oldAdvisorId} (attempt ${count})`,
    );
    // 2. Assign to a new advisor (Logic for picking the best advisor can be added here)
    // For now, let's assume we have a way to pick the next one or it goes back to pool
    // In v1, reassignment might be back to "PRECALIFICADO" for manual intervention
    // or picking another one from the advisors list.

    // As per requirement: "Lead changes to internal NO_ATENDIDO state, reassigned automatically"
    // I'll emit an event so a "Matchmaker" service can pick a new advisor.
  }

  async createAssignment(leadId: number, advisorId: number) {
    this.logger.log(
      `Creating assignment for lead ${leadId} -> advisor ${advisorId}`,
    );
    try {
      const assignment = this.assignmentsRepository.create({
        lead_id: leadId,
        advisor_id: advisorId,
      });
      const saved = await this.assignmentsRepository.save(assignment);
      this.logger.log(
        `Assignment saved successfully: ${JSON.stringify(saved)}`,
      );
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create assignment: ${error}`);
      throw error;
    }
  }
}
