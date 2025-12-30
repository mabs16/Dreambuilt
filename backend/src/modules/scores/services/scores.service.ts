import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Score } from '../entities/score.entity';
import { Advisor } from '../../advisors/entities/advisor.entity';

@Injectable()
export class ScoresService {
  constructor(
    @InjectRepository(Score)
    private readonly scoreRepository: Repository<Score>,
    @InjectRepository(Advisor)
    private readonly advisorRepository: Repository<Advisor>,
  ) {}

  async addScore(
    advisorId: number,
    leadId: number,
    points: number,
    reason: string,
  ): Promise<Score> {
    const score = this.scoreRepository.create({
      advisor_id: advisorId,
      lead_id: leadId,
      points,
      reason,
    });

    await this.scoreRepository.save(score);

    // Update Advisor total score
    await this.advisorRepository.increment({ id: advisorId }, 'score', points);

    return score;
  }
}
