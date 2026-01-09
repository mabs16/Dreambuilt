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
      model: 'gemini-3-flash-preview', // Using the latest flash model
    });
  }

  async getAnalysis() {
    // Fallback to heuristic analysis if AI is not configured
    if (!this.model) {
      this.logger.log('AI not configured, running heuristic analysis...');
      return this.runHeuristicAnalysis();
    }

    try {
      // Fetch summarized data
      const campaigns = await this.campaignRepo.find({
        order: { spend: 'DESC' },
        take: 5,
      });
      const topAds = await this.adRepo.find({
        order: { results: 'DESC' },
        take: 5,
      });
      const expensiveAds = await this.adRepo.find({
        order: { cost_per_result: 'DESC' },
        take: 5,
      });

      // Construct Prompt
      const prompt = `Actúa como un Experto en Marketing Digital y Meta Ads. Analiza los siguientes datos de rendimiento de campañas inmobiliarias y dame 3 recomendaciones estratégicas claras y accionables.

DATOS DE CAMPAÑAS (Top 5 por Gasto):
${campaigns
  .map(
    (c) =>
      `- ${c.name}: Gasto $${c.spend}, Leads ${c.results}, Costo/Lead $${c.cost_per_result}, CTR ${c.ctr_all}%`,
  )
  .join('\n')}

TOP ANUNCIOS (Más Resultados):
${topAds
  .map(
    (a) => `- ${a.name}: Leads ${a.results}, Costo/Lead $${a.cost_per_result}`,
  )
  .join('\n')}

ANUNCIOS MÁS COSTOSOS (Mayor Costo por Resultado):
${expensiveAds
  .map(
    (a) => `- ${a.name}: Leads ${a.results}, Costo/Lead $${a.cost_per_result}`,
  )
  .join('\n')}

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
      const responseText = result.response
        .text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(responseText);
    } catch (error) {
      this.logger.error(
        'AI Analysis failed, falling back to heuristics',
        error,
      );
      return this.runHeuristicAnalysis();
    }
  }

  async chatWithData(question: string, contextData: any) {
    if (!this.model) {
      return {
        answer:
          'La IA no está configurada. Por favor revisa la variable GEMINI_API_KEY.',
      };
    }

    try {
      const prompt = `
        Actúa como un Consultor Senior de Marketing Digital especializado en Meta Ads.
        Tienes acceso a los siguientes datos resumidos de las campañas del usuario:
        ${JSON.stringify(contextData, null, 2)}

        El usuario te hace la siguiente pregunta sobre sus datos o estrategia:
        "${question}"

        Instrucciones:
        1. Responde de manera directa y concisa.
        2. Usa los datos proporcionados para respaldar tus respuestas.
        3. Si la pregunta no se puede responder con los datos, explícalo amablemente y ofrece consejos generales.
        4. Mantén un tono profesional pero accesible.
        5. Habla siempre en Español.
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return { answer: response };
    } catch (error) {
      console.error('Full Error in chatWithData:', error);
      this.logger.error('Error in chatWithData', error);
      return {
        answer: `Lo siento, hubo un error técnico: ${error.message || error}. Por favor verifica la consola del servidor.`,
      };
    }
  }

  private async runHeuristicAnalysis() {
    const campaigns = await this.campaignRepo.find({
      order: { spend: 'DESC' },
      take: 5,
    });

    const highCplCampaigns = campaigns.filter(
      (c) => Number(c.cost_per_result) > 400,
    ); // Umbral ejemplo
    const lowCtrCampaigns = campaigns.filter((c) => Number(c.ctr_all) < 1.0);
    const zeroLeadCampaigns = campaigns.filter(
      (c) => Number(c.spend) > 500 && Number(c.results) === 0,
    );

    const recommendations: Array<{
      title: string;
      description: string;
      impact: string;
    }> = [];
    let alert = '';

    if (zeroLeadCampaigns.length > 0) {
      alert = `Hay ${zeroLeadCampaigns.length} campañas gastando presupuesto sin generar leads.`;
      recommendations.push({
        title: 'Pausar campañas ineficientes',
        description: `Las campañas como "${zeroLeadCampaigns[0].name}" no han generado resultados. Revísalas urgente.`,
        impact: 'Alto',
      });
    }

    if (highCplCampaigns.length > 0) {
      recommendations.push({
        title: 'Optimizar Costo por Lead',
        description: `El costo por lead en "${highCplCampaigns[0].name}" es elevado. Revisa la segmentación.`,
        impact: 'Medio',
      });
    }

    if (lowCtrCampaigns.length > 0) {
      recommendations.push({
        title: 'Mejorar Creativos (CTR Bajo)',
        description: `El CTR en "${lowCtrCampaigns[0].name}" es menor al 1%. Prueba nuevos anuncios/imágenes.`,
        impact: 'Medio',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Escalar Campañas Exitosas',
        description:
          'El rendimiento parece estable. Considera aumentar presupuesto en las campañas con mejor retorno.',
        impact: 'Alto',
      });
    }

    return {
      summary:
        'Análisis basado en reglas heurísticas (IA no disponible). Se han detectado oportunidades de optimización basándose en umbrales estándar.',
      recommendations: recommendations.slice(0, 3),
      alert,
    };
  }
}
