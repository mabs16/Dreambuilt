import { Controller, Post, Get, Body, Query, Headers, BadRequestException, Logger, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../services/whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
    private readonly logger = new Logger(WhatsappController.name);

    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly configService: ConfigService,
    ) { }

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
    async handleWebhook(@Body() body: any) {
        this.logger.log('Received webhook:', JSON.stringify(body));

        // Validate it's a message event
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value.messages) {
                        // Extract contact info (includes profile name)
                        const contacts = change.value.contacts || [];
                        const contactMap = new Map<string, string>();
                        for (const contact of contacts) {
                            if (contact.profile?.name) {
                                contactMap.set(contact.wa_id, contact.profile.name);
                            }
                        }

                        for (const message of change.value.messages) {
                            let body = message.text?.body;
                            if (message.type === 'interactive' && message.interactive) {
                                if (message.interactive.type === 'button_reply') {
                                    body = message.interactive.button_reply.id;
                                } else if (message.interactive.type === 'list_reply') {
                                    body = message.interactive.list_reply.id;
                                }
                            }

                            const profileName = contactMap.get(message.from) || undefined;
                            await this.whatsappService.processIncomingMessage(
                                message.from,
                                body,
                                message.id,
                                profileName,
                            );
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
