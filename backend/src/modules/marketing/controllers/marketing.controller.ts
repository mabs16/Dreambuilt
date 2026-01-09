import { Controller, Post, Get, Logger } from '@nestjs/common';
import { MarketingDataService } from '../services/marketing-data.service';
import { MarketingAiService } from '../services/marketing-ai.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('marketing')
export class MarketingController {
  private readonly logger = new Logger(MarketingController.name);

  // Hardcoded path as per user requirement for this environment
  private readonly DATA_PATH =
    'C:\\Users\\User\\Documents\\WINDSURF\\Mabo_OS\\Data_Meta';

  constructor(
    private readonly ingestService: MarketingDataService,
    private readonly aiService: MarketingAiService,
  ) {}

  @Post('sync')
  async syncData() {
    this.logger.log('Starting manual synchronization of Meta data...');

    const results: {
      campaigns: boolean;
      adsets: boolean;
      ads: boolean;
      errors: string[];
    } = {
      campaigns: false,
      adsets: false,
      ads: false,
      errors: [],
    };

    try {
      // Find files dynamically or use specific names?
      // User provided specific names but let's try to match patterns to be more robust
      // Dream-uilt-2022-Campañas-1-ene-2025---8-ene-2026.xlsx
      // Modified to match the standardized names from upload

      const files = fs.readdirSync(this.DATA_PATH);

      const campaignFile = files.find(
        (f) => f.includes('Campañas') && f.endsWith('.xlsx'),
      );
      const adSetFile = files.find(
        (f) => f.includes('Conjuntos-de-anuncios') && f.endsWith('.xlsx'),
      );
      const adFile = files.find(
        (f) =>
          f.includes('Anuncios') &&
          f.endsWith('.xlsx') &&
          !f.includes('Conjuntos'),
      );

      if (campaignFile) {
        await this.ingestService.ingestFile(
          path.join(this.DATA_PATH, campaignFile),
          'campaign',
        );
        results.campaigns = true;
      } else {
        results.errors.push('No Campaign file found');
      }

      if (adSetFile) {
        await this.ingestService.ingestFile(
          path.join(this.DATA_PATH, adSetFile),
          'adset',
        );
        results.adsets = true;
      } else {
        results.errors.push('No AdSet file found');
      }

      if (adFile) {
        await this.ingestService.ingestFile(
          path.join(this.DATA_PATH, adFile),
          'ad',
        );
        results.ads = true;
      } else {
        results.errors.push('No Ad file found');
      }

      return { success: true, results };
    } catch (error) {
      this.logger.error('Sync failed', error);
      return { success: false, error: error.message };
    }
  }

  @Get('summary')
  getSummary() {
    // Placeholder for dashboard stats
    return {
      message: 'Summary endpoint ready',
    };
  }

  @Get('analyze')
  async getAnalysis() {
    return this.aiService.getAnalysis();
  }
}
