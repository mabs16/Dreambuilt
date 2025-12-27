import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Assignment } from './entities/assignment.entity';

@Injectable()
export class AssignmentsService {
    constructor(
        @InjectRepository(Assignment)
        private readonly assignmentsRepository: Repository<Assignment>,
    ) { }

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

        // 2. Assign to a new advisor (Logic for picking the best advisor can be added here)
        // For now, let's assume we have a way to pick the next one or it goes back to pool
        // In v1, reassignment might be back to "PRECALIFICADO" for manual intervention
        // or picking another one from the advisors list.

        // As per requirement: "Lead changes to internal NO_ATENDIDO state, reassigned automatically"
        // I'll emit an event so a "Matchmaker" service can pick a new advisor.
    }

    async createAssignment(leadId: number, advisorId: number) {
        const assignment = this.assignmentsRepository.create({
            lead_id: leadId,
            advisor_id: advisorId,
        });
        return this.assignmentsRepository.save(assignment);
    }
}
