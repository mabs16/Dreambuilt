import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Advisor } from './entities/advisor.entity';
import { AdvisorsService } from './advisors.service';
import { AdvisorsController } from './advisors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Advisor])],
  controllers: [AdvisorsController],
  providers: [AdvisorsService],
  exports: [AdvisorsService],
})
export class AdvisorsModule {}
