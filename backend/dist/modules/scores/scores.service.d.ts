import { Repository } from 'typeorm';
import { Score } from './entities/score.entity';
import { Advisor } from '../advisors/entities/advisor.entity';
export declare class ScoresService {
    private readonly scoreRepository;
    private readonly advisorRepository;
    constructor(scoreRepository: Repository<Score>, advisorRepository: Repository<Advisor>);
    addScore(advisorId: number, leadId: number, points: number, reason: string): Promise<Score>;
}
