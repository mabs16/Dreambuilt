import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentsService } from './services/assignments.service';
import { AdvisorsModule } from '../advisors/advisors.module';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment]), AdvisorsModule],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
