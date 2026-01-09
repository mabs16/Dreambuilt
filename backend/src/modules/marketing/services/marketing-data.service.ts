import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingAdSet } from '../entities/marketing-adset.entity';
import { MarketingAd } from '../entities/marketing-ad.entity';

@Injectable()
export class MarketingDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketingDataService.name);

  constructor(
    @InjectRepository(MarketingCampaign)
    private campaignRepo: Repository<MarketingCampaign>,
    @InjectRepository(MarketingAdSet)
    private adSetRepo: Repository<MarketingAdSet>,
    @InjectRepository(MarketingAd)
    private adRepo: Repository<MarketingAd>,
  ) {}

  onModuleInit() {
    this.logger.log('MarketingDataService initialized');
  }

  async ingestFile(filePath: string, type: 'campaign' | 'adset' | 'ad') {
    this.logger.log(`Starting ingestion for ${type} from ${filePath}`);

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to JSON with header row 0 (which is line 1 in Excel usually)
      const rawData = XLSX.utils.sheet_to_json(sheet);

      this.logger.log(`Found ${rawData.length} rows`);

      if (type === 'campaign') {
        await this.processCampaigns(rawData);
      } else if (type === 'adset') {
        await this.processAdSets(rawData);
      } else if (type === 'ad') {
        await this.processAds(rawData);
      }

      this.logger.log(`Ingestion completed for ${type}`);
    } catch (error) {
      this.logger.error(
        `Error ingesting ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private cleanName(name: any): string | null {
    if (!name) return null;
    return String(name).trim();
  }

  private async processCampaigns(data: any[]) {
    for (const row of data) {
      const name = this.cleanName(row['Nombre de la campaña']);
      if (!name) continue;

      const entityData = {
        name: name,
        status:
          row['Estado de entrega'] ||
          row['Entrega'] ||
          row['Status'] ||
          'Unknown',
        objective: row['Objetivo'] || row['Objective'] || 'Unknown',
        results: this.parseNumber(row['Resultados']),
        reach: this.parseNumber(row['Alcance']),
        impressions: this.parseNumber(row['Impresiones']),
        spend: this.parseNumber(row['Importe gastado (MXN)']),
        clicks: this.parseNumber(row['Clics (todos)']),
        ctr: this.parseNumber(row['CTR (todos)']),
        cpc: this.parseNumber(row['CPC (todos) (MXN)']),
        cost_per_result: this.parseNumber(row['Costo por resultados']),
      };

      // Upsert
      const existing = await this.campaignRepo.findOne({ where: { name } });
      if (existing) {
        await this.campaignRepo.update(existing.id, entityData);
      } else {
        await this.campaignRepo.save(this.campaignRepo.create(entityData));
      }
    }
  }

  private async processAdSets(data: any[]) {
    for (const row of data) {
      const name = this.cleanName(row['Nombre del conjunto de anuncios']);
      if (!name) continue;

      const entityData = {
        name: name,
        campaign_name: this.cleanName(row['Nombre de la campaña']),
        status:
          row['Estado de entrega'] ||
          row['Entrega'] ||
          row['Status'] ||
          'Unknown',
        objective: row['Objetivo'] || row['Objective'] || 'Unknown',
        results: this.parseNumber(row['Resultados']),
        reach: this.parseNumber(row['Alcance']),
        impressions: this.parseNumber(row['Impresiones']),
        spend: this.parseNumber(row['Importe gastado (MXN)']),
        clicks: this.parseNumber(row['Clics (todos)']),
        ctr: this.parseNumber(row['CTR (todos)']),
        cpc: this.parseNumber(row['CPC (todos) (MXN)']),
        cost_per_result: this.parseNumber(row['Costo por resultados']),
      };

      // Upsert
      const existing = await this.adSetRepo.findOne({ where: { name } });
      if (existing) {
        await this.adSetRepo.update(existing.id, entityData);
      } else {
        await this.adSetRepo.save(this.adSetRepo.create(entityData));
      }
    }
  }

  private async processAds(data: any[]) {
    for (const row of data) {
      const name = this.cleanName(row['Nombre del anuncio']);
      if (!name) continue;

      const entityData = {
        name: name,
        adset_name: this.cleanName(row['Nombre del conjunto de anuncios']),
        campaign_name: this.cleanName(row['Nombre de la campaña']),
        status:
          row['Estado de entrega'] ||
          row['Entrega'] ||
          row['Status'] ||
          'Unknown',
        results: this.parseNumber(row['Resultados']),
        reach: this.parseNumber(row['Alcance']),
        impressions: this.parseNumber(row['Impresiones']),
        spend: this.parseNumber(row['Importe gastado (MXN)']),
        clicks: this.parseNumber(row['Clics (todos)']),
        ctr: this.parseNumber(row['CTR (todos)']),
        cpc: this.parseNumber(row['CPC (todos) (MXN)']),
        cost_per_result: this.parseNumber(row['Costo por resultados']),
      };

      // Upsert
      const existing = await this.adRepo.findOne({ where: { name } });
      if (existing) {
        await this.adRepo.update(existing.id, entityData);
      } else {
        await this.adRepo.save(this.adRepo.create(entityData));
      }
    }
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
}
