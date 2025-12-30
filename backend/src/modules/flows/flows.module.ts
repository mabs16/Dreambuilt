import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowsService } from './services/flows.service';
import { FlowsController } from './controllers/flows.controller';
import { Flow } from './entities/flow.entity';
import { FlowSession } from './entities/flow-session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flow, FlowSession])],
  providers: [FlowsService],
  controllers: [FlowsController],
  exports: [FlowsService],
})
export class FlowsModule {}
