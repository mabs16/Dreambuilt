import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { MarketingCampaign } from '../entities/marketing-campaign.entity';
import { MarketingAdSet } from '../entities/marketing-adset.entity';
import { MarketingAd } from '../entities/marketing-ad.entity';

@Injectable()
export class MarketingAiService {
  private readonly logger = new Logger(MarketingAiService.name);
  private genAI?: GoogleGenerativeAI;
  private model?: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MarketingCampaign)
    private campaignRepo: Repository<MarketingCampaign>,
    @InjectRepository(MarketingAdSet)
    private adSetRepo: Repository<MarketingAdSet>,
    @InjectRepository(MarketingAd)
    private adRepo: Repository<MarketingAd>,
  ) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. AI analysis disabled.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Using a fast model for analysis
    });
  }

  async getAnalysis() {
    if (!this.model) {
      return { error: 'AI not configured' };
    }

    try {
      // Fetch summarized data
      const campaigns = await this.campaignRepo.find({ order: { spend: 'DESC' }, take: 5 });
      const topAds = await this.adRepo.find({ order: { results: 'DESC' }, take: 5 });
      const expensiveAds = await this.adRepo.find({ order: { cost_per_result: 'DESC' }, take: 5 });

      // Construct Prompt
      let prompt = `Actúa como un Experto en Marketing Digital y Meta Ads. Analiza los siguientes datos de rendimiento de campañas inmobiliarias y dame 3 recomendaciones estratégicas claras y accionables.

DATOS DE CAMPAÑAS (Top 5 por Gasto):
${campaigns.map(c => `- ${c.name}: Gasto $${c.spend}, Leads ${c.results}, Costo/Lead $${c.cost_per_result}, CTR ${c.ctr}%`).join('\n')}

TOP ANUNCIOS (Más Resultados):
${topAds.map(a => `- ${a.name}: Leads ${a.results}, Costo/Lead $${a.cost_per_result}`).join('\n')}

ANUNCIOS MÁS COSTOSOS (Mayor Costo por Resultado):
${expensiveAds.map(a => `- ${a.name}: Leads ${a.results}, Costo/Lead $${a.cost_per_result}`).join('\n')}

TU RESPUESTA DEBE SEGUIR ESTE FORMATO JSON:
{
  "summary": "Breve resumen de la situación general (max 2 lineas)",
  "recommendations": [
    {
      "title": "Titulo de la recomendación",
      "description": "Explicación detallada",
      "impact": "Alto/Medio/Bajo"
    }
  ],
  "alert": "Alguna alerta crítica si la hay (opcional)"
}
NO incluyas markdown, solo el JSON puro.`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean markdown if present
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(cleanJson);

    } catch (error) {
      this.logger.error('Error generating AI analysis', error);
      return { 
        summary: "No se pudo generar el análisis en este momento.",
        recommendations: [],
        error: error.message 
      };
    }
  }
}
