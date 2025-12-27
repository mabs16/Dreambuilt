import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  BadRequestException,
  Logger,
  Param,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';

interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          interactive?: {
            type: string;
            button_reply?: {
              id: string;
              title: string;
            };
            list_reply?: {
              id: string;
              title: string;
              description?: string;
            };
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>('whatsapp.verifyToken');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new BadRequestException('Verification failed');
  }

  @Post('webhook')
  async handleWebhook(@Body() body: WhatsAppWebhookBody) {
    this.logger.log('Received webhook:', JSON.stringify(body));

    // Validate it's a message event
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry;
      for (const entry of entries) {
        for (const change of entry.changes) {
          const changeValue = change.value;
          if (changeValue?.messages) {
            // Extract contact info (includes profile name)
            const contacts = changeValue.contacts || [];
            const contactMap = new Map<string, string>();
            for (const contact of contacts) {
              const contactProfile = contact.profile;
              if (contactProfile?.name) {
                contactMap.set(
                  String(contact.wa_id),
                  String(contactProfile.name),
                );
              }
            }

            const messages = changeValue.messages;
            for (const message of messages) {
              const messageText = message.text;
              let messageBody = messageText?.body;

              if (message.type === 'interactive' && message.interactive) {
                const messageInteractive = message.interactive;
                if (messageInteractive.type === 'button_reply') {
                  const buttonReply = messageInteractive.button_reply;
                  messageBody = buttonReply?.id;
                } else if (messageInteractive.type === 'list_reply') {
                  const listReply = messageInteractive.list_reply;
                  messageBody = listReply?.id;
                }
              }

              const from = String(message.from);
              const messageId = String(message.id);
              const profileName = contactMap.get(from);

              if (messageBody) {
                await this.whatsappService.processIncomingMessage(
                  from,
                  messageBody,
                  messageId,
                  profileName,
                );
              }
            }
          }
        }
      }
    }

    return { status: 'ok' };
  }

  @Get('messages')
  async getLatestChats() {
    return this.whatsappService.getLatestChats();
  }

  @Get('messages/:phone')
  async getHistory(@Param('phone') phone: string) {
    return this.whatsappService.getMessageHistory(phone);
  }

  @Post('messages')
  async sendMessage(@Body() body: { to: string; message: string }) {
    if (!body.to || !body.message) {
      throw new BadRequestException('Missing to or message');
    }
    return this.whatsappService.sendOutboundMessage(body.to, body.message);
  }
}
