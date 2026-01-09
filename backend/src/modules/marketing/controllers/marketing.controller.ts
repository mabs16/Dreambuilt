import {
  Controller,
  Post,
  Get,
  Logger,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MarketingDataService } from '../services/marketing-data.service';
import { MarketingAiService } from '../services/marketing-ai.service';
import * as path from 'path';
import * as fs from 'fs';

@Controller('marketing')
export class MarketingController {
  private readonly logger = new Logger(MarketingController.name);

  // Dynamic path based on environment
  private readonly DATA_PATH = path.join(process.cwd(), 'Data_Meta');

  constructor(
    private readonly ingestService: MarketingDataService,
    private readonly aiService: MarketingAiService,
  ) {
    // Ensure data directory exists
    if (!fs.existsSync(this.DATA_PATH)) {
      fs.mkdirSync(this.DATA_PATH, { recursive: true });
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'campaigns', maxCount: 1 },
      { name: 'adsets', maxCount: 1 },
      { name: 'ads', maxCount: 1 },
    ]),
  )
  async uploadFiles(
    @UploadedFiles()
    files: {
      campaigns?: Express.Multer.File[];
      adsets?: Express.Multer.File[];
      ads?: Express.Multer.File[];
    },
  ) {
    this.logger.log('Uploading and processing Meta data files...');

    if (!files.campaigns || !files.adsets || !files.ads) {
      return {
        success: false,
        error: 'Missing required files (campaigns, adsets, ads)',
      };
    }

    try {
      // Save files
      const campaignPath = await this.saveFile(files.campaigns[0], 'Campaigns');
      const adsetPath = await this.saveFile(files.adsets[0], 'AdSets');
      const adPath = await this.saveFile(files.ads[0], 'Ads');

      const results = {
        campaigns: false,
        adsets: false,
        ads: false,
        errors: [] as string[],
      };

      try {
        await this.ingestService.ingestFile(campaignPath, 'campaign');
        results.campaigns = true;
      } catch (e) {
        results.errors.push(`Campaign ingest error: ${e.message}`);
      }

      try {
        await this.ingestService.ingestFile(adsetPath, 'adset');
        results.adsets = true;
      } catch (e) {
        results.errors.push(`AdSet ingest error: ${e.message}`);
      }

      try {
        await this.ingestService.ingestFile(adPath, 'ad');
        results.ads = true;
      } catch (e) {
        results.errors.push(`Ad ingest error: ${e.message}`);
      }

      return { success: true, results };
    } catch (error) {
      this.logger.error('Upload/Process failed', error);
      return { success: false, error: error.message };
    }
  }

  private async saveFile(
    file: Express.Multer.File,
    suffix: string,
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Meta_${suffix}_${timestamp}.xlsx`;
    const filePath = path.join(this.DATA_PATH, filename);

    await fs.promises.writeFile(filePath, file.buffer);
    return filePath;
  }

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
      if (!fs.existsSync(this.DATA_PATH)) {
        return { success: false, error: 'Data directory not found' };
      }

      const files = fs.readdirSync(this.DATA_PATH);

      const campaignFile = files.find(
        (f) =>
          (f.includes('Campaigns') || f.includes('Campañas')) &&
          f.endsWith('.xlsx'),
      );
      const adSetFile = files.find(
        (f) =>
          (f.includes('AdSets') || f.includes('Conjuntos')) &&
          f.endsWith('.xlsx'),
      );
      const adFile = files.find(
        (f) =>
          (f.includes('Ads') || f.includes('Anuncios')) &&
          f.endsWith('.xlsx') &&
          !f.includes('AdSets') &&
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
  async getSummary() {
    return this.ingestService.getSummary();
  }

  @Get('analyze')
  async getAnalysis() {
    return this.aiService.getAnalysis();
  }
}
