import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCampaign } from './entities/marketing-campaign.entity';
import { MarketingAdSet } from './entities/marketing-adset.entity';
import { MarketingAd } from './entities/marketing-ad.entity';
import { MarketingDataService } from './services/marketing-data.service';
// Service for AI Analysis
import { MarketingAiService } from './services/marketing-ai.service';
import { MarketingController } from './controllers/marketing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingCampaign, MarketingAdSet, MarketingAd]),
  ],
  controllers: [MarketingController],
  providers: [MarketingDataService, MarketingAiService],
  exports: [MarketingDataService],
})
export class MarketingModule {}
