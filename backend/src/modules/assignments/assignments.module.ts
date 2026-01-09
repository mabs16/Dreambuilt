import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentsService } from './services/assignments.service';
import { AdvisorsModule } from '../advisors/advisors.module';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment]),
    AdvisorsModule,
    forwardRef(() => ScoresModule),
  ],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
