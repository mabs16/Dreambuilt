import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Score } from './entities/score.entity';
import { Advisor } from '../advisors/entities/advisor.entity';
import { ScoresService } from './scores.service';
import { AdvisorsModule } from '../advisors/advisors.module';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Score, Advisor]),
    AdvisorsModule,
    forwardRef(() => LeadsModule),
  ],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
