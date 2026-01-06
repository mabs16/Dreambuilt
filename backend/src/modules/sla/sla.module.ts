import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { BullModule } from '@nestjs/bullmq';
import { SlaJob } from './entities/sla-job.entity';
import { SlaService } from './services/sla.service';
import { SlaProcessor } from './processors/sla.processor';
import { LeadsModule } from '../leads/leads.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { ScoresModule } from '../scores/scores.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AdvisorsModule } from '../advisors/advisors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SlaJob]),
    // BullModule.registerQueue({
    //   name: 'sla-queue',
    // }),
    forwardRef(() => LeadsModule),
    AssignmentsModule,
    forwardRef(() => ScoresModule),
    forwardRef(() => WhatsappModule),
    AdvisorsModule,
  ],
  providers: [SlaService, SlaProcessor],
  exports: [SlaService],
})
export class SlaModule {}
