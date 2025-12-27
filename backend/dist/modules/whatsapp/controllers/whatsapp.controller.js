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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WhatsappController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const whatsapp_service_1 = require("../services/whatsapp.service");
let WhatsappController = WhatsappController_1 = class WhatsappController {
    whatsappService;
    configService;
    logger = new common_1.Logger(WhatsappController_1.name);
    constructor(whatsappService, configService) {
        this.whatsappService = whatsappService;
        this.configService = configService;
    }
    verifyWebhook(mode, token, challenge) {
        const verifyToken = this.configService.get('whatsapp.verifyToken');
        if (mode === 'subscribe' && token === verifyToken) {
            return challenge;
        }
        throw new common_1.BadRequestException('Verification failed');
    }
    async handleWebhook(body) {
        this.logger.log('Received webhook:', JSON.stringify(body));
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value.messages) {
                        const contacts = change.value.contacts || [];
                        const contactMap = new Map();
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
                                }
                                else if (message.interactive.type === 'list_reply') {
                                    body = message.interactive.list_reply.id;
                                }
                            }
                            const profileName = contactMap.get(message.from) || undefined;
                            await this.whatsappService.processIncomingMessage(message.from, body, message.id, profileName);
                        }
                    }
                }
            }
        }
        return { status: 'ok' };
    }
    async getLatestChats() {
        return this.whatsappService.getLatestChats();
    }
    async getHistory(phone) {
        return this.whatsappService.getMessageHistory(phone);
    }
    async sendMessage(body) {
        if (!body.to || !body.message) {
            throw new common_1.BadRequestException('Missing to or message');
        }
        return this.whatsappService.sendOutboundMessage(body.to, body.message);
    }
};
exports.WhatsappController = WhatsappController;
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WhatsappController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('messages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getLatestChats", null);
__decorate([
    (0, common_1.Get)('messages/:phone'),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('messages'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappController.prototype, "sendMessage", null);
exports.WhatsappController = WhatsappController = WhatsappController_1 = __decorate([
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_service_1.WhatsappService,
        config_1.ConfigService])
], WhatsappController);
//# sourceMappingURL=whatsapp.controller.js.map