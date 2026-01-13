import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { AdvisorsService } from '../../advisors/services/advisors.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScoresService } from '../../scores/services/scores.service';
import { Advisor } from '../../advisors/entities/advisor.entity';

interface RawAssignmentCount {
  advisorId: string;
  count: string;
}

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    private readonly advisorsService: AdvisorsService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ScoresService))
    private readonly scoresService: ScoresService,
  ) {}

  async findBestAdvisorForAssignment(
    strategy: 'ROUND_ROBIN' | 'QUOTA_DEFICIT' = 'QUOTA_DEFICIT',
  ): Promise<Advisor | null> {
    const availableAdvisors = await this.advisorsService.findAllAvailable();
    if (availableAdvisors.length === 0) return null;

    const today = new Date();
    const dayOfMonth = today.getDate();

    // 1. Get assignments count for today for each advisor
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayAssignments = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .select('assignment.advisor_id', 'advisorId')
      .addSelect('COUNT(assignment.id)', 'count')
      .where('assignment.assigned_at BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .groupBy('assignment.advisor_id')
      .getRawMany<RawAssignmentCount>();

    const assignmentCounts = new Map<number, number>();
    todayAssignments.forEach((a) => {
      assignmentCounts.set(parseInt(a.advisorId, 10), parseInt(a.count, 10));
    });

    // STRATEGY 1: ROUND ROBIN
    // Used explicitly OR if Quota Deficit is active but it's the first 7 days
    if (
      strategy === 'ROUND_ROBIN' ||
      (strategy === 'QUOTA_DEFICIT' && dayOfMonth <= 7)
    ) {
      this.logger.log(
        `Assignment Strategy: ROUND ROBIN ${strategy === 'QUOTA_DEFICIT' ? '(First 7 days)' : '(Forced)'}`,
      );
      // Pick advisor with FEWEST assignments today
      // Shuffle first to randomize ties
      const shuffled = availableAdvisors.sort(() => 0.5 - Math.random());
      return shuffled.reduce((prev, curr) => {
        const prevCount = assignmentCounts.get(Number(prev.id)) || 0;
        const currCount = assignmentCounts.get(Number(curr.id)) || 0;
        return prevCount < currCount ? prev : curr;
      });
    }

    // STRATEGY 2: QUOTA DEFICIT (Day 8+)
    this.logger.log('Assignment Strategy: QUOTA DEFICIT (Merit Based)');

    // Calculate Monthly Scores
    const advisorScores = new Map<number, number>();
    let totalScore = 0;

    for (const advisor of availableAdvisors) {
      const score = await this.scoresService.getMonthlyScore(advisor.id);
      // Ensure minimum score of 1 to avoid division by zero or exclusion
      // New advisors or those with 0 score get a baseline chance
      const effectiveScore = Math.max(score, 1);
      advisorScores.set(Number(advisor.id), effectiveScore);
      totalScore += effectiveScore;
    }

    const totalAssignmentsCount = Array.from(assignmentCounts.values()).reduce(
      (a, b) => a + b,
      0,
    );
    // Add +1 for the current assignment being decided
    const nextTotalAssignments = totalAssignmentsCount + 1;

    let bestAdvisor = availableAdvisors[0];
    let maxDeficit = -Infinity;

    for (const advisor of availableAdvisors) {
      const score = advisorScores.get(Number(advisor.id)) || 1;
      const targetShare = score / totalScore;
      const expectedAssignments = targetShare * nextTotalAssignments;
      const actualAssignments = assignmentCounts.get(Number(advisor.id)) || 0;

      const deficit = expectedAssignments - actualAssignments;

      this.logger.debug(
        `Advisor ${advisor.name}: Score=${score}, Share=${targetShare.toFixed(
          2,
        )}, Exp=${expectedAssignments.toFixed(
          2,
        )}, Act=${actualAssignments}, Deficit=${deficit.toFixed(2)}`,
      );

      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        bestAdvisor = advisor;
      }
    }

    this.logger.log(
      `Selected Best Advisor: ${bestAdvisor.name} (Deficit: ${maxDeficit.toFixed(
        2,
      )})`,
    );
    return bestAdvisor;
  }

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
