import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
export declare class AssignmentsService {
    private readonly assignmentsRepository;
    constructor(assignmentsRepository: Repository<Assignment>);
    findActiveAssignment(leadId: number): Promise<Assignment | null>;
    reassign(leadId: number, oldAdvisorId: number, count: number): Promise<void>;
    createAssignment(leadId: number, advisorId: number): Promise<Assignment>;
}
