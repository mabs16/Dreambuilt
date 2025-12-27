import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './controllers/whatsapp.controller';
import { WhatsappService } from './services/whatsapp.service';
import { CommandParser } from './services/command-parser.service';
import { AutomationsService } from './services/automations.service';
import { GeminiService } from './services/gemini.service';
import { AdvisorsModule } from '../advisors/advisors.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { LeadsModule } from '../leads/leads.module';
import { Message } from './entities/message.entity';
import { Automation } from './entities/automation.entity';
import { AutomationsController } from './controllers/automations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Automation]),
    AdvisorsModule,
    AssignmentsModule,
    forwardRef(() => LeadsModule),
  ],
  controllers: [WhatsappController, AutomationsController],
  providers: [
    WhatsappService,
    CommandParser,
    AutomationsService,
    GeminiService,
  ],
  exports: [WhatsappService, AutomationsService],
})
export class WhatsappModule {}
