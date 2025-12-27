import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { CommandParser } from './command-parser.service';
import { AdvisorsService } from '../../advisors/advisors.service';
import { AssignmentsService } from '../../assignments/assignments.service';
import { LeadsService } from '../../leads/leads.service';
import { Message } from '../entities/message.entity';
import { AutomationsService } from './automations.service';
import { GeminiService } from './gemini.service';
interface WhatsAppInteractive {
    type: string;
    body: {
        text: string;
    };
    action: {
        buttons: Array<{
            type: string;
            reply: {
                id: string;
                title: string;
            };
        }>;
    };
}
interface WhatsAppPayload {
    type: 'interactive' | 'text';
    interactive?: WhatsAppInteractive;
    text?: {
        body: string;
    };
}
export declare class WhatsappService {
    private readonly commandParser;
    private readonly advisorsService;
    private readonly assignmentsService;
    private readonly leadsService;
    private readonly eventEmitter;
    private readonly configService;
    private readonly messageRepository;
    private readonly automationsService;
    private readonly geminiService;
    private readonly logger;
    private readonly redis;
    constructor(commandParser: CommandParser, advisorsService: AdvisorsService, assignmentsService: AssignmentsService, leadsService: LeadsService, eventEmitter: EventEmitter2, configService: ConfigService, messageRepository: Repository<Message>, automationsService: AutomationsService, geminiService: GeminiService);
    handleOtpRequested(payload: {
        name: string;
        phone: string;
        pin: string;
    }): Promise<void>;
    processIncomingMessage(from: string, body: string, waId?: string, profileName?: string): Promise<void>;
    private handleAdvisorMessage;
    private handleLeadMessage;
    private handleInfo;
    sendWelcomeMessage(to: string, leadName?: string): Promise<void>;
    sendWhatsappMessage(to: string, content: string | WhatsAppPayload): Promise<void>;
    private sendErrorMessage;
    sendOutboundMessage(to: string, body: string): Promise<{
        status: string;
        message: Message;
    }>;
    getLatestChats(): Promise<any[]>;
    getMessageHistory(phone: string): Promise<Message[]>;
    private buildSystemPrompt;
}
export {};
