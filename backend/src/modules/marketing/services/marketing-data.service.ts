import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as XLSX from 'xlsx';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingAdSet } from '../entities/marketing-adset.entity';
import { MarketingAd } from '../entities/marketing-ad.entity';

const FIELD_MAPPING = {
  // IDs & Names
  'Nombre de la campaña': 'campaign_name',
  'Nombre del conjunto de anuncios': 'adset_name',
  'Nombre del anuncio': 'name',

  // Status & Dates
  'Estado de entrega': 'status',
  Entrega: 'status',
  Status: 'status',
  Objetivo: 'objective',
  'Fecha de creación': 'creation_date',
  Inicio: 'meta_date_start',
  Fin: 'meta_date_stop',
  Divisa: 'currency',

  // Metrics
  Resultados: 'results',
  'Indicador de resultado': 'result_indicator',
  Alcance: 'reach',
  Frecuencia: 'frequency',
  'Importe gastado (MXN)': 'spend',
  Impresiones: 'impressions',
  'Impresiones totales (incluye impresiones no válidas de tráfico no atribuible a personas)':
    'impressions_gross',
  'Clics (todos)': 'clicks_all',
  'CTR (todos)': 'ctr_all',
  'CPC (todos) (MXN)': 'cpc_all',
  Visualizaciones: 'views',
  'Tasa de resultados': 'result_rate',
  Espectadores: 'viewers',
  'Costo por resultados': 'cost_per_result',
  'Costo por mil cuentas del centro de cuentas alcanzadas (MXN)':
    'cost_per_m_reached',
  'CPM (costo por mil impresiones) (MXN)': 'cpm',

  // Engagement
  'Porcentaje de resultados por clics en el enlace': 'link_click_result_rate',
  'Porcentaje de visitas a la página de destino por clics en el enlace':
    'landing_page_view_rate',
  'Comentarios de publicaciones': 'post_comments',
  'Costo por interacción con la página (MXN)': 'cost_per_page_engagement',
  'Costo por Me gusta (MXN)': 'cost_per_like',
  'Interacción con la página': 'page_engagement',
  'Interacciones con la publicación': 'post_engagement',
  'Reacciones a publicaciones': 'post_reactions',
  'Veces que se guardaron las publicaciones': 'post_saves',
  'Costo por interacción (MXN)': 'cost_per_engagement',
  'Costo por interacción con una publicación (MXN)': 'cost_per_post_engagement',
  Interacciones: 'engagement_total',
  'Me gusta en Facebook': 'fb_likes',
  'Seguimientos de Instagram': 'ig_follows',
  'Veces que se compartieron las publicaciones': 'post_shares',

  // Messaging
  'Contactos de mensajes': 'messaging_contacts',
  'Conversaciones con mensajes iniciadas': 'messaging_conversations_started',
  'Costo por contacto de mensajes (MXN)': 'cost_per_messaging_contact',
  'Costo por conversación con mensajes iniciada (MXN)':
    'cost_per_messaging_conversation_started',

  // Video
  'Reproducciones de video de 3 segundos': 'video_plays_3s',
  'Costo por ThruPlay (MXN)': 'cost_per_thruplay',
  ThruPlays: 'thruplays',
  'Reproducciones de video': 'video_plays',
  'Costo por reproducción de video de 3 segundos (MXN)':
    'cost_per_video_play_3s',
  'Porcentaje de reproducciones de video de 3 segundos por impresiones':
    'video_plays_3s_rate',
  'Reproducciones de video hasta el 100%': 'video_plays_100p',
  'Tiempo promedio de reproducción del video': 'video_avg_time',

  // Clicks
  'Porcentaje de clics salientes únicos': 'outbound_clicks_unique_ctr',
  'CTR único (porcentaje de clics en el enlace)': 'ctr_unique_link',
  'CPC (costo por clic en el enlace) (MXN)': 'cpc_link',
  'Costo por clic único (todos) (MXN)': 'cost_per_unique_click_all',
  'Costo por clic saliente (MXN)': 'cost_per_outbound_click',
  'Clics únicos (todos)': 'unique_clicks_all',
  'Clics en el enlace': 'link_clicks',
  'Clics salientes': 'outbound_clicks',
  'Clics únicos en el enlace': 'unique_link_clicks',
  'Clics salientes únicos': 'unique_outbound_clicks',
  'Costo por clic saliente único (MXN)': 'cost_per_unique_outbound_click',
  'Costo por clic único en el enlace (MXN)': 'cost_per_unique_link_click',
  'CTR (porcentaje de clics en el enlace)': 'ctr_link',
  'CTR único (todos)': 'ctr_unique_all',
  'Porcentaje de clics salientes': 'outbound_clicks_ctr',

  // Web / Conversions
  'Visitas al perfil de Instagram': 'ig_profile_visits',
  'Clientes potenciales': 'leads',
  'Clientes potenciales en Meta': 'leads_meta',
  'Costo por cliente potencial (MXN)': 'cost_per_lead',
  'Visitas a la página de destino': 'landing_page_views',
  'Visitas a la página de destino del sitio web': 'website_landing_page_visits',
  'Costo por visita a la página de destino (MXN)':
    'cost_per_landing_page_visit',
  'Costo por tipo de acción Completo Form TYP':
    'cost_per_action_type_full_form',
  'Completo Form TYP': 'full_form_typ',
};

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
      const workbook = XLSX.readFile(filePath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

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

  async getSummary(startDate?: string, endDate?: string) {
    const applyFilters = (qb: any) => {
      if (startDate) {
        qb.andWhere('campaign.meta_date_start >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('campaign.meta_date_start <= :endDate', { endDate });
      }
      return qb;
    };

    const { sum: totalSpend } = await applyFilters(
      this.campaignRepo.createQueryBuilder('campaign'),
    )
      .select('SUM(campaign.spend)', 'sum')
      .getRawOne();

    const { sum: totalLeads } = await applyFilters(
      this.campaignRepo.createQueryBuilder('campaign'),
    )
      .select('SUM(campaign.results)', 'sum')
      .getRawOne();

    const { avg: avgCtr } = await applyFilters(
      this.campaignRepo.createQueryBuilder('campaign'),
    )
      .select('AVG(campaign.ctr_all)', 'avg')
      .getRawOne();

    const { sum: totalImpressions } = await applyFilters(
      this.campaignRepo.createQueryBuilder('campaign'),
    )
      .select('SUM(campaign.impressions)', 'sum')
      .getRawOne();

    const { sum: totalClicks } = await applyFilters(
      this.campaignRepo.createQueryBuilder('campaign'),
    )
      .select('SUM(campaign.clicks_all)', 'sum')
      .getRawOne();

    const spend = parseFloat((totalSpend as string) || '0');
    const leads = parseFloat((totalLeads as string) || '0');
    const ctr = parseFloat((avgCtr as string) || '0');
    const impressions = parseFloat((totalImpressions as string) || '0');
    const clicks = parseFloat((totalClicks as string) || '0');

    return {
      totalSpend: spend,
      totalLeads: leads,
      costPerLead: leads > 0 ? spend / leads : 0,
      avgCtr: ctr,
      totalImpressions: impressions,
      totalClicks: clicks,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    };
  }

  private cleanName(name: any): string | null {
    if (!name) return null;
    return String(name).trim();
  }

  private mapRowToEntity(
    row: any,
    entityType: 'campaign' | 'adset' | 'ad',
  ): any {
    const entity: any = {};

    // 1. Map common fields defined in FIELD_MAPPING
    for (const [header, property] of Object.entries(FIELD_MAPPING)) {
      if (row[header] !== undefined) {
        // Handle numbers
        if (
          [
            'spend',
            'impressions',
            'reach',
            'frequency',
            'results',
            'clicks_all',
            'ctr_all',
            'cpc_all',
            'views',
            'viewers',
            'cost_per_result',
            'cost_per_m_reached',
            'cpm',
            'post_comments',
            'post_reactions',
            'post_saves',
            'post_shares',
            'fb_likes',
            'ig_follows',
            'messaging_contacts',
            'messaging_conversations_started',
            'video_plays_3s',
            'thruplays',
            'video_plays',
            'video_plays_100p',
            'unique_clicks_all',
            'link_clicks',
            'outbound_clicks',
            'landing_page_views',
            'leads',
            'leads_meta',
            'full_form_typ',
          ].includes(property) ||
          property.startsWith('cost_') ||
          property.endsWith('_rate') ||
          property.endsWith('_ctr') ||
          property.endsWith('_avg_time')
        ) {
          entity[property] = this.parseNumber(row[header]);
        }
        // Handle dates
        else if (
          ['creation_date', 'meta_date_start', 'meta_date_stop'].includes(
            property,
          )
        ) {
          entity[property] = this.parseDate(row[header]);
        }
        // Handle strings
        else {
          // Special handling for names based on entity type is done below
          if (
            property !== 'name' &&
            property !== 'campaign_name' &&
            property !== 'adset_name'
          ) {
            entity[property] = row[header];
          }
        }
      }
    }

    // 2. Explicit Name Mapping
    if (entityType === 'campaign') {
      entity.name = this.cleanName(row['Nombre de la campaña']);
    } else if (entityType === 'adset') {
      entity.name = this.cleanName(row['Nombre del conjunto de anuncios']);
      entity.campaign_name = this.cleanName(row['Nombre de la campaña']);
    } else if (entityType === 'ad') {
      entity.name = this.cleanName(row['Nombre del anuncio']);
      entity.adset_name = this.cleanName(
        row['Nombre del conjunto de anuncios'],
      );
      entity.campaign_name = this.cleanName(row['Nombre de la campaña']);
    }

    return entity;
  }

  private async processCampaigns(data: any[]) {
    for (const row of data) {
      const entityData = this.mapRowToEntity(row, 'campaign');
      if (!entityData.name) continue;

      // Smart Upsert: Update if exists (for 2026 data evolution), Insert if new.
      // Identification by Name (assuming unique campaign names)
      const existing = await this.campaignRepo.findOne({
        where: { name: entityData.name },
      });

      if (existing) {
        await this.campaignRepo.update(
          existing.id,
          entityData as unknown as DeepPartial<MarketingCampaign>,
        );
      } else {
        await this.campaignRepo.save(
          this.campaignRepo.create(
            entityData as unknown as DeepPartial<MarketingCampaign>,
          ),
        );
      }
    }
  }

  private async processAdSets(data: any[]) {
    for (const row of data) {
      const entityData = this.mapRowToEntity(row, 'adset');
      if (!entityData.name) continue;

      // Smart Upsert: AdSet Name + Campaign Name
      const where: any = { name: entityData.name };
      if (entityData.campaign_name) {
        where.campaign_name = entityData.campaign_name;
      }

      const existing = await this.adSetRepo.findOne({ where });

      if (existing) {
        await this.adSetRepo.update(
          existing.id,
          entityData as unknown as DeepPartial<MarketingAdSet>,
        );
      } else {
        await this.adSetRepo.save(
          this.adSetRepo.create(
            entityData as unknown as DeepPartial<MarketingAdSet>,
          ),
        );
      }
    }
  }

  private async processAds(data: any[]) {
    for (const row of data) {
      const entityData = this.mapRowToEntity(row, 'ad');
      if (!entityData.name) continue;

      // Smart Upsert: Ad Name + AdSet Name + Campaign Name
      const where: any = { name: entityData.name };
      if (entityData.adset_name) {
        where.adset_name = entityData.adset_name;
      }
      if (entityData.campaign_name) {
        where.campaign_name = entityData.campaign_name;
      }

      const existing = await this.adRepo.findOne({ where });

      if (existing) {
        await this.adRepo.update(
          existing.id,
          entityData as unknown as DeepPartial<MarketingAd>,
        );
      } else {
        await this.adRepo.save(
          this.adRepo.create(entityData as unknown as DeepPartial<MarketingAd>),
        );
      }
    }
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove symbols like $ and , but keep .
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    const date = new Date(value as string | number);
    return isNaN(date.getTime()) ? null : date;
  }
}
