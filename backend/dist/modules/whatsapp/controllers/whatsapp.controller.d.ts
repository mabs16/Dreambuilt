import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly configService;
    private readonly logger;
    constructor(whatsappService: WhatsappService, configService: ConfigService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleWebhook(body: any): Promise<{
        status: string;
    }>;
    getLatestChats(): Promise<any[]>;
    getHistory(phone: string): Promise<import("../entities/message.entity").Message[]>;
    sendMessage(body: {
        to: string;
        message: string;
    }): Promise<{
        status: string;
        message: import("../entities/message.entity").Message;
    }>;
}
