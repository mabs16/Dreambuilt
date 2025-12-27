"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
let GeminiService = GeminiService_1 = class GeminiService {
    configService;
    logger = new common_1.Logger(GeminiService_1.name);
    genAI;
    model;
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('GEMINI_API_KEY') ||
            process.env.GEMINI_API_KEY;
        this.logger.log(`GEMINI_API_KEY check: ${apiKey ? 'Found (' + apiKey.substring(0, 10) + '...)' : 'NOT FOUND'}`);
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY not configured. AI responses disabled.');
            return;
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
        });
        this.logger.log('GeminiService initialized with gemini-3-flash-preview');
    }
    async generateResponse(systemPrompt, conversationHistory, userMessage) {
        if (!this.model) {
            this.logger.warn('Model not initialized');
            return 'Lo siento, el asistente no está disponible en este momento.';
        }
        try {
            this.logger.log(`Generating response for: "${userMessage.substring(0, 50)}..."`);
            let fullPrompt = systemPrompt + '\n\n';
            if (conversationHistory.length > 0) {
                fullPrompt += 'HISTORIAL DE LA CONVERSACIÓN:\n';
                for (const msg of conversationHistory.slice(-6)) {
                    const role = msg.role === 'user' ? 'Prospecto' : 'Tú';
                    fullPrompt += `${role}: ${msg.content}\n`;
                }
                fullPrompt += '\n';
            }
            fullPrompt += `MENSAJE ACTUAL DEL PROSPECTO: ${userMessage}\n\nTU RESPUESTA:`;
            const result = await this.model.generateContent(fullPrompt);
            const response = result.response.text();
            this.logger.log(`Gemini response generated successfully (${response.length} chars)`);
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : '';
            this.logger.error(`Gemini API error: ${errorMessage}`);
            this.logger.error(`Stack: ${errorStack}`);
            return 'Disculpa, hubo un problema procesando tu mensaje. ¿Podrías repetirlo?';
        }
    }
    async generateSimpleResponse(prompt) {
        if (!this.model) {
            return 'Lo siento, el asistente no está disponible en este momento.';
        }
        try {
            const result = await this.model.generateContent(prompt);
            return result.response.text();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Gemini API error: ${errorMessage}`);
            return 'Disculpa, hubo un problema procesando tu mensaje.';
        }
    }
    async summarizeLeadConversation(history, customPrompt) {
        if (!this.model)
            return 'Resumen no disponible.';
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Gemini Summarization error: ${errorMessage}`);
            return 'No se pudo generar el resumen.';
        }
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map