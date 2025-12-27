import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI?: GoogleGenerativeAI;
  private model?: GenerativeModel;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;
    this.logger.log(
      `GEMINI_API_KEY check: ${apiKey ? 'Found (' + apiKey.substring(0, 10) + '...)' : 'NOT FOUND'}`,
    );

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured. AI responses disabled.');
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-3-flash-preview (latest version requested)
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });
    this.logger.log('GeminiService initialized with gemini-3-flash-preview');
  }

  async generateResponse(
    systemPrompt: string,
    conversationHistory: { role: 'user' | 'model'; content: string }[],
    userMessage: string,
  ): Promise<string> {
    if (!this.model) {
      this.logger.warn('Model not initialized');
      return 'Lo siento, el asistente no está disponible en este momento.';
    }

    try {
      this.logger.log(
        `Generating response for: "${userMessage.substring(0, 50)}..."`,
      );

      // Build a simple prompt with context
      let fullPrompt = systemPrompt + '\n\n';

      // Add conversation history as context
      if (conversationHistory.length > 0) {
        fullPrompt += 'HISTORIAL DE LA CONVERSACIÓN:\n';
        for (const msg of conversationHistory.slice(-6)) {
          // Last 6 messages for context
          const role = msg.role === 'user' ? 'Prospecto' : 'Tú';
          fullPrompt += `${role}: ${msg.content}\n`;
        }
        fullPrompt += '\n';
      }

      fullPrompt += `MENSAJE ACTUAL DEL PROSPECTO: ${userMessage}\n\nTU RESPUESTA:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response.text();

      this.logger.log(
        `Gemini response generated successfully (${response.length} chars)`,
      );
      return response;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`Gemini API error: ${errorMessage}`);
      this.logger.error(`Stack: ${errorStack}`);
      return 'Disculpa, hubo un problema procesando tu mensaje. ¿Podrías repetirlo?';
    }
  }

  async generateSimpleResponse(prompt: string): Promise<string> {
    if (!this.model) {
      return 'Lo siento, el asistente no está disponible en este momento.';
    }

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini API error: ${errorMessage}`);
      return 'Disculpa, hubo un problema procesando tu mensaje.';
    }
  }

  async summarizeLeadConversation(
    history: { role: 'user' | 'model'; content: string }[],
    customPrompt?: string,
  ): Promise<string> {
    if (!this.model) return 'Resumen no disponible.';

    const defaultPrompt = `Resume esta conversación de precalificación de un lead. 
        Extrae los puntos clave (nombre, interés, presupuesto, urgencia, etc.) de manera muy concisa para un asesor de ventas.
        Usa viñetas y emojis. Mantén el tono profesional.`;

    const systemPrompt = customPrompt || defaultPrompt;

    try {
      const prompt = `${systemPrompt}\n\nHISTORIAL:\n${history
        .map((m) => `${m.role === 'user' ? 'Prospecto' : 'IA'}: ${m.content}`)
        .join('\n')}`;
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini Summarization error: ${errorMessage}`);
      return 'No se pudo generar el resumen.';
    }
  }
}
