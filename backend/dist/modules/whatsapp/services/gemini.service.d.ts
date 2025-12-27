import { ConfigService } from '@nestjs/config';
export declare class GeminiService {
    private readonly configService;
    private readonly logger;
    private genAI?;
    private model?;
    constructor(configService: ConfigService);
    generateResponse(systemPrompt: string, conversationHistory: {
        role: 'user' | 'model';
        content: string;
    }[], userMessage: string): Promise<string>;
    generateSimpleResponse(prompt: string): Promise<string>;
    summarizeLeadConversation(history: {
        role: 'user' | 'model';
        content: string;
    }[], customPrompt?: string): Promise<string>;
}
