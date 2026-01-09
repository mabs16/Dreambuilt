import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';
import { startOfMonth, endOfMonth } from 'date-fns';

interface RawScoreResult {
  total: string;
}

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    @InjectRepository(Advisor)
    private readonly advisorRepository: Repository<Advisor>,
  ) {}

  async getMonthlyScore(
    advisorId: number,
    date: Date = new Date(),
  ): Promise<number> {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const result = await this.scoreRepository
      .createQueryBuilder('score')
      .select('SUM(score.points)', 'total')
      .where('score.advisor_id = :advisorId', { advisorId })
      .andWhere('score.created_at BETWEEN :start AND :end', { start, end })
      .getRawOne<RawScoreResult>();

    return result ? parseInt(result.total, 10) || 0 : 0;
  }

  async addScore(
    advisorId: number,
    leadId: number,
    points: number,
    reason: string,
  ): Promise<Score> {
    // Check monthly limit for NOTE points
    if (reason.startsWith('NOTA_CALIDAD')) {
      const currentMonthScore = await this.getMonthlyScoreByReason(
        advisorId,
        'NOTA_CALIDAD',
      );
      if (currentMonthScore >= 100) {
        // Limit reached, save with 0 points but log it
        points = 0;
        reason += ' (Monthly Limit Reached)';
      }
    }

    const score = this.scoreRepository.create({
      advisor_id: advisorId,
      lead_id: leadId,
      points,
      reason,
    });

    await this.scoreRepository.save(score);

    // Update Advisor total score (Historical)
    await this.advisorRepository.increment({ id: advisorId }, 'score', points);

    return score;
  }

  private async getMonthlyScoreByReason(
    advisorId: number,
    reasonPrefix: string,
  ): Promise<number> {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    const result = await this.scoreRepository
      .createQueryBuilder('score')
      .select('SUM(score.points)', 'total')
      .where('score.advisor_id = :advisorId', { advisorId })
      .andWhere('score.reason LIKE :reason', { reason: `${reasonPrefix}%` })
      .andWhere('score.created_at BETWEEN :start AND :end', { start, end })
      .getRawOne<RawScoreResult>();

    return result ? parseInt(result.total, 10) || 0 : 0;
  }

  async getLatestScoreByReason(
    advisorId: number,
    leadId: number,
    reasonPrefix: string,
  ): Promise<Score | null> {
    return this.scoreRepository.findOne({
      where: {
        advisor_id: advisorId,
        lead_id: leadId,
        reason: reasonPrefix, // Or Like? Usually exact match for reason string or prefix check
      },
      order: { created_at: 'DESC' },
    });
  }
}
