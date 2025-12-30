import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadNote } from './entities/lead-note.entity';
import { LeadsService } from './services/leads.service';
import { LeadStateMachine } from './services/lead-state-machine.service';
import { PipelineService } from './services/pipeline.service';
import { ScoresModule } from '../scores/scores.module';
import { SlaModule } from '../sla/sla.module';
import { AssignmentsModule } from '../assignments/assignments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadNote]),
    forwardRef(() => ScoresModule),
    forwardRef(() => SlaModule),
    AssignmentsModule,
  ],
  providers: [LeadsService, LeadStateMachine, PipelineService],
  exports: [LeadsService, LeadStateMachine, PipelineService],
})
export class LeadsModule {}
