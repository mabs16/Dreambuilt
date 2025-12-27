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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsappService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = __importDefault(require("axios"));
const ioredis_1 = __importDefault(require("ioredis"));
const command_parser_service_1 = require("./command-parser.service");
const advisors_service_1 = require("../../advisors/advisors.service");
const assignments_service_1 = require("../../assignments/assignments.service");
const leads_service_1 = require("../../leads/leads.service");
const message_entity_1 = require("../entities/message.entity");
const automations_service_1 = require("./automations.service");
const gemini_service_1 = require("./gemini.service");
const lead_entity_1 = require("../../leads/entities/lead.entity");
let WhatsappService = WhatsappService_1 = class WhatsappService {
    commandParser;
    advisorsService;
    assignmentsService;
    leadsService;
    eventEmitter;
    configService;
    messageRepository;
    automationsService;
    geminiService;
    logger = new common_1.Logger(WhatsappService_1.name);
    redis;
    constructor(commandParser, advisorsService, assignmentsService, leadsService, eventEmitter, configService, messageRepository, automationsService, geminiService) {
        this.commandParser = commandParser;
        this.advisorsService = advisorsService;
        this.assignmentsService = assignmentsService;
        this.leadsService = leadsService;
        this.eventEmitter = eventEmitter;
        this.configService = configService;
        this.messageRepository = messageRepository;
        this.automationsService = automationsService;
        this.geminiService = geminiService;
        const redisConfig = this.configService.get('redis');
        if (!redisConfig) {
            throw new Error('Redis configuration is missing');
        }
        this.redis = new ioredis_1.default({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls,
        });
    }
    async handleOtpRequested(payload) {
        this.logger.log(`Evento OTP recibido para ${payload.phone}`);
        const message = `¡Hola ${payload.name}! Tu código de verificación para Mabō OS es: ${payload.pin}. Expira en 5 minutos.`;
        await this.sendWhatsappMessage(payload.phone, message);
    }
    async processIncomingMessage(from, body, waId, profileName) {
        if (!body)
            return;
        const msg = this.messageRepository.create({
            waId,
            from,
            to: 'SYSTEM',
            body,
            direction: message_entity_1.MessageDirection.INBOUND,
        });
        await this.messageRepository.save(msg);
        try {
            const advisor = await this.advisorsService.findByPhone(from);
            if (advisor) {
                return await this.handleAdvisorMessage(advisor, from, body);
            }
            const isBotActive = await this.automationsService.isBotActive();
            if (isBotActive) {
                await this.handleLeadMessage(from, body, profileName);
            }
        }
        catch (error) {
            const err = error;
            this.logger.error(`Error processing message from ${from}: ${err.message}`);
            await this.sendErrorMessage(from, err.message);
        }
    }
    async handleAdvisorMessage(advisor, from, body) {
        const stateKey = `advisor_state:${from}`;
        const stateRaw = await this.redis.get(stateKey);
        let parsed = null;
        try {
            parsed = this.commandParser.parse(body);
        }
        catch {
        }
        if (stateRaw && !parsed) {
            const state = JSON.parse(stateRaw);
            if (state.type === 'WAITING_FOR_NOTES') {
                await this.leadsService.addNote({
                    leadId: state.leadId,
                    advisorId: advisor.id,
                    content: body,
                    type: 'MANUAL',
                });
                await this.redis.del(stateKey);
                const advAuto = await this.automationsService.getConfig('advisor_automation');
                const advConfig = advAuto?.config;
                const successMsg = advConfig?.successNoteMessage
                    ? advConfig.successNoteMessage.replace(/\{\{lead_id\}\}/g, String(state.leadId))
                    : `✅ Nota guardada para el Lead #${state.leadId}. ¡Gracias!`;
                await this.sendWhatsappMessage(from, successMsg);
                const nextSteps = `*Próximos pasos sugeridos:*\n- Si el lead está en proceso, envía: \`${state.leadId} SEGUIMIENTO\`\n- Si agendaste cita, envía: \`${state.leadId} CITA\`\n- Para ver más info, envía: \`${state.leadId} INFO\``;
                await this.sendWhatsappMessage(from, nextSteps);
                return;
            }
        }
        if (!parsed) {
            if (/^\d+\s+.*/.test(body)) {
                await this.sendWhatsappMessage(from, '❌ No entendí ese comando. Usa: `[ID] [COMANDO]`\nEjemplos: `123 CONTACTADO`, `123 CITA`, `123 INFO`');
            }
            else {
                this.logger.debug(`Advisor ${advisor.name} sent a non-command message: ${body}`);
            }
            return;
        }
        const activeAssignment = await this.assignmentsService.findActiveAssignment(parsed.leadId);
        if (!activeAssignment ||
            Number(activeAssignment.advisor_id) !== Number(advisor.id)) {
            this.eventEmitter.emit('event.created', {
                leadId: parsed.leadId,
                advisorId: advisor.id,
                type: 'INVALID_OWNERSHIP_ATTEMPT',
                payload: { command: parsed.type, from },
            });
            throw new common_1.BadRequestException('Este Lead no está asignado a ti.');
        }
        const advAuto = await this.automationsService.getConfig('advisor_automation');
        const advConfig = advAuto?.config;
        switch (parsed.type) {
            case command_parser_service_1.CommandType.ACTIVAR:
            case command_parser_service_1.CommandType.INFO:
                await this.handleInfo(parsed.leadId, from);
                break;
            case command_parser_service_1.CommandType.CONTACTADO: {
                await this.leadsService.updateStatus(parsed.leadId, lead_entity_1.LeadStatus.CONTACTADO);
                const contactadoMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `👍 Lead #${parsed.leadId} marcado como CONTACTADO.\n\nPor favor, escribe ahora una breve nota sobre este primer contacto:`;
                await this.sendWhatsappMessage(from, contactadoMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.SEGUIMIENTO: {
                await this.leadsService.updateStatus(parsed.leadId, lead_entity_1.LeadStatus.SEGUIMIENTO);
                const seguimientoMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `🔄 Lead #${parsed.leadId} ahora está en SEGUIMIENTO. ¿Alguna nota sobre el avance?`;
                await this.sendWhatsappMessage(from, seguimientoMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.CITA: {
                await this.leadsService.updateStatus(parsed.leadId, lead_entity_1.LeadStatus.CITA);
                const citaMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `📅 CITA agendada para el Lead #${parsed.leadId}. ¡Excelente!\n\nPor favor, indica la fecha y detalles en una nota:`;
                await this.sendWhatsappMessage(from, citaMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.PERDIDO: {
                await this.leadsService.updateStatus(parsed.leadId, lead_entity_1.LeadStatus.PERDIDO);
                const perdidoMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `📉 Lead #${parsed.leadId} marcado como PERDIDO. ¿Cuál fue el motivo? (Escribe una nota)`;
                await this.sendWhatsappMessage(from, perdidoMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.CIERRE: {
                await this.leadsService.updateStatus(parsed.leadId, lead_entity_1.LeadStatus.CIERRE);
                const cierreMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `🥳 ¡FELICIDADES! Lead #${parsed.leadId} marcado como CIERRE/CLIENTE.\n\nEscribe una nota final sobre la venta:`;
                await this.sendWhatsappMessage(from, cierreMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.INTENTO_CONTACTO: {
                const intentoMsg = advConfig?.notesPromptMessage
                    ? advConfig.notesPromptMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                    : `📞 Intento de contacto registrado para el Lead #${parsed.leadId}. ¿Qué sucedió? (Escribe una nota)`;
                await this.sendWhatsappMessage(from, intentoMsg);
                await this.redis.set(stateKey, JSON.stringify({
                    type: 'WAITING_FOR_NOTES',
                    leadId: parsed.leadId,
                    timestamp: Date.now(),
                }), 'EX', 1800);
                break;
            }
            case command_parser_service_1.CommandType.NOTAS:
                if (parsed.value) {
                    await this.leadsService.addNote({
                        leadId: parsed.leadId,
                        advisorId: advisor.id,
                        content: parsed.value,
                        type: 'MANUAL',
                    });
                    const successMsg = advConfig?.successNoteMessage
                        ? advConfig.successNoteMessage.replace(/\{\{lead_id\}\}/g, String(parsed.leadId))
                        : `✅ Nota guardada para el Lead #${parsed.leadId}.`;
                    await this.sendWhatsappMessage(from, successMsg);
                }
                else {
                    await this.sendWhatsappMessage(from, `📝 Escribe a continuación la nota que deseas agregar al Lead #${parsed.leadId}:`);
                    await this.redis.set(stateKey, JSON.stringify({
                        type: 'WAITING_FOR_NOTES',
                        leadId: parsed.leadId,
                        timestamp: Date.now(),
                    }), 'EX', 1800);
                }
                break;
            default: {
                const typeStr = String(parsed.type);
                this.eventEmitter.emit(`command.${typeStr.toLowerCase()}`, {
                    leadId: parsed.leadId,
                    advisorId: advisor.id,
                    value: parsed.value,
                });
            }
        }
    }
    async handleLeadMessage(from, body, profileName) {
        const isAdvisor = await this.advisorsService.findByPhone(from);
        if (isAdvisor) {
            this.logger.warn(`Unexpected: Advisor ${from} reaching handleLeadMessage. Skipping.`);
            return;
        }
        let lead = await this.leadsService.findByPhone(from);
        const leadName = profileName || 'Prospecto WhatsApp';
        if (!lead) {
            lead = await this.leadsService.createLead({
                name: leadName,
                phone: from,
                source: 'WHATSAPP_BOT',
            });
            this.logger.log(`New lead created for bot: ${from} (Name: ${leadName})`);
        }
        else if (profileName && lead.name === 'Prospecto WhatsApp') {
            await this.leadsService.updateName(lead.id, profileName);
            lead.name = profileName;
            this.logger.log(`Lead ${from} name updated to: ${profileName}`);
        }
        if (lead.status !== lead_entity_1.LeadStatus.NUEVO) {
            this.logger.debug(`Lead ${from} is not in NUEVO status, skipping bot logic.`);
            return;
        }
        if (body === 'START_QUALIFICATION') {
            body = 'Hola, estoy listo para comenzar.';
        }
        else {
            const lastSystemMsg = await this.messageRepository.findOne({
                where: { to: from, direction: message_entity_1.MessageDirection.OUTBOUND },
                order: { createdAt: 'DESC' },
            });
            const isWelcomeMsg = lastSystemMsg && lastSystemMsg.body.includes('Presiona “Comenzar”');
            if (!lastSystemMsg || isWelcomeMsg) {
                await this.sendWelcomeMessage(from, lead.name);
                return;
            }
        }
        const automation = await this.automationsService.getConfig();
        if (!automation?.config || automation.name !== 'lead_qualification') {
            return;
        }
        const botConfig = automation.config;
        const historyKey = `bot_history:${from}`;
        const stateKey = `bot_state:${from}`;
        const historyRaw = await this.redis.get(historyKey);
        const history = historyRaw
            ? JSON.parse(historyRaw)
            : [];
        history.push({ role: 'user', content: body });
        const systemPrompt = this.buildSystemPrompt(botConfig, lead.name);
        const aiResponse = await this.geminiService.generateResponse(systemPrompt, history, body);
        this.logger.debug(`[AI DEBUG] Phone: ${from} | User: ${body} | AI: ${aiResponse}`);
        if (!aiResponse) {
            this.logger.error('Gemini returned empty response');
            await this.sendWhatsappMessage(from, 'Lo siento, estoy pensando un poco más lento de lo normal. ¿Podrías repetirlo?');
            return;
        }
        history.push({ role: 'model', content: aiResponse });
        await this.redis.set(historyKey, JSON.stringify(history), 'EX', 3600);
        let isCompleted = aiResponse.includes('[COMPLETED]');
        let cleanResponse = aiResponse;
        if (!isCompleted) {
            const lowerResp = aiResponse.toLowerCase();
            const closurePhrases = [
                'se pondrá en contacto',
                'he recibido tus datos',
                'gracias por la información',
                'gracias por tus respuestas',
            ];
            if (history.length > 2 &&
                closurePhrases.some((p) => lowerResp.includes(p))) {
                this.logger.warn(`Fallback: Detected closure phrase in AI response. Marking as COMPLETED.`);
                isCompleted = true;
            }
        }
        if (isCompleted) {
            cleanResponse = cleanResponse.replace('[COMPLETED]', '').trim();
            await this.sendWhatsappMessage(from, cleanResponse);
            await this.leadsService.updateStatus(lead.id, lead_entity_1.LeadStatus.PRECALIFICADO);
            this.logger.log(`Lead ${from} pre-calificado exitosamente via AI.`);
            try {
                const advisor = await this.advisorsService.findFirstAvailable();
                if (advisor) {
                    await this.assignmentsService.createAssignment(lead.id, advisor.id);
                    await this.leadsService.updateStatus(lead.id, lead_entity_1.LeadStatus.ASIGNADO);
                    this.logger.log(`Lead ${from} assigned to advisor ${advisor.name} (${advisor.phone})`);
                    const advAuto = await this.automationsService.getConfig('advisor_automation');
                    const advConfig = advAuto?.config;
                    const historyRaw = await this.redis.get(historyKey);
                    let summary = 'No hay historial.';
                    if (historyRaw) {
                        const history = JSON.parse(historyRaw);
                        if (advConfig?.useAiSummary) {
                            summary = await this.geminiService.summarizeLeadConversation(history, advConfig.aiSummaryPrompt || undefined);
                        }
                        else {
                            summary = history
                                .filter((h) => h.role === 'user' || h.role === 'model')
                                .map((h) => `${h.role === 'user' ? '👤' : '🤖'}: ${h.content}`)
                                .join('\n');
                        }
                    }
                    const responseLimit = advConfig?.responseTimeLimitMinutes || 15;
                    let advisorMsg = `🔔 *NUEVO LEAD ASIGNADO*\n\n👤 *Prospecto:* ${lead.name}\n📱 *Teléfono:* ${from}\n\n*RESUMEN DE PRECALIFICACIÓN:*\n${summary}\n\n⚠️ *URGENCIA:* Debes responder en menos de ${responseLimit} min.\n\nAcción rápida:`;
                    if (advConfig?.assignmentMessage) {
                        advisorMsg = advConfig.assignmentMessage
                            .replace(/\{\{lead_id\}\}/g, String(lead.id))
                            .replace(/\{\{lead_name\}\}/g, lead.name)
                            .replace(/\{\{phone\}\}/g, from)
                            .replace(/\{\{summary\}\}/g, summary)
                            .replace(/\{\{response_limit\}\}/g, String(responseLimit));
                    }
                    if (advConfig?.enableInteractiveButtons !== false) {
                        const payload = {
                            type: 'interactive',
                            interactive: {
                                type: 'button',
                                body: { text: advisorMsg },
                                action: {
                                    buttons: [
                                        {
                                            type: 'reply',
                                            reply: {
                                                id: `${lead.id} CONTACTADO`,
                                                title: '✅ CONTACTADO',
                                            },
                                        },
                                        {
                                            type: 'reply',
                                            reply: {
                                                id: `${lead.id} INFO`,
                                                title: 'ℹ️ VER INFO',
                                            },
                                        },
                                    ],
                                },
                            },
                        };
                        await this.sendWhatsappMessage(advisor.phone, payload);
                    }
                    else {
                        await this.sendWhatsappMessage(advisor.phone, `${advisorMsg}\n\nEscribe \`${lead.id} CONTACTADO\` para empezar.`);
                    }
                    await this.redis.del(historyKey);
                    await this.redis.del(stateKey);
                    this.eventEmitter.emit('lead.prequalified', {
                        leadId: lead.id,
                        phone: from,
                        advisorId: advisor.id,
                    });
                }
            }
            catch (assignError) {
                const err = assignError;
                this.logger.error(`Error during auto-assignment: ${err.message}`);
            }
        }
        else {
            await this.sendWhatsappMessage(from, aiResponse);
        }
    }
    async handleInfo(leadId, from) {
        const lead = await this.leadsService.findById(leadId);
        const notes = await this.leadsService.getNotes(leadId);
        const historyKey = `bot_history:${lead.phone}`;
        const historyRaw = await this.redis.get(historyKey);
        let summary = 'No hay historial de precalificación.';
        if (historyRaw) {
            const history = JSON.parse(historyRaw);
            summary = history
                .filter((h) => h.role === 'user' || h.role === 'model')
                .map((h) => `${h.role === 'user' ? '👤' : '🤖'}: ${h.content}`)
                .join('\n');
        }
        const info = `
*DETALLE DEL LEAD #${lead.id}*
👤 Nombre: ${lead.name}
📱 Teléfono: ${lead.phone}
🚦 Estado: ${lead.status}
📅 Creado: ${lead.created_at.toLocaleString()}

*RESUMEN PRECALIFICACIÓN:*
${summary}

*ÚLTIMAS NOTAS:*
${notes.length > 0
            ? notes
                .slice(0, 3)
                .map((n) => `- ${n.content}`)
                .join('\n')
            : 'Sin notas.'}

Link: https://wa.me/${lead.phone}
`;
        await this.sendWhatsappMessage(from, info);
    }
    async sendWelcomeMessage(to, leadName) {
        const automation = await this.automationsService.getConfig();
        const config = automation?.name === 'lead_qualification'
            ? automation.config
            : null;
        let welcomeText = config?.welcomeMessage ||
            'Hola 👋\nSoy el asistente automático de Mabō OS.\n\nPara dirigir tu solicitud correctamente y evitar demoras, necesito hacerte 3 preguntas rápidas.\n\n👉 Presiona “Comenzar” para continuar.';
        const buttonText = config?.welcomeButtonText || 'Comenzar';
        if (leadName && leadName !== 'Prospecto WhatsApp' && leadName !== to) {
            if (welcomeText.includes('{{name}}')) {
                welcomeText = welcomeText.replace('{{name}}', leadName);
            }
            else if (welcomeText.toLowerCase().startsWith('hola')) {
                welcomeText = welcomeText.replace(/Hola/i, `Hola ${leadName}`);
            }
        }
        else {
            welcomeText = welcomeText.replace('{{name}}', '');
        }
        const payload = {
            type: 'interactive',
            interactive: {
                type: 'button',
                body: {
                    text: welcomeText,
                },
                action: {
                    buttons: [
                        {
                            type: 'reply',
                            reply: {
                                id: 'START_QUALIFICATION',
                                title: buttonText,
                            },
                        },
                    ],
                },
            },
        };
        await this.sendWhatsappMessage(to, payload);
    }
    async sendWhatsappMessage(to, content) {
        const accessToken = this.configService.get('whatsapp.accessToken');
        const phoneNumberId = this.configService.get('whatsapp.phoneNumberId');
        const apiVersion = this.configService.get('whatsapp.apiVersion') || 'v21.0';
        if (!accessToken || !phoneNumberId) {
            this.logger.warn(`WhatsApp credentials missing. Simulating send to ${to}`);
            return;
        }
        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
        const cleanTo = to.replace(/\D/g, '');
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanTo,
        };
        if (typeof content === 'string') {
            payload.type = 'text';
            payload.text = { body: content };
        }
        else if (content.type === 'interactive') {
            payload.type = 'interactive';
            payload.interactive = content.interactive;
        }
        else {
            Object.assign(payload, content);
        }
        try {
            const response = await axios_1.default.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const waId = response.data
                .messages[0].id;
            this.logger.log(`WhatsApp message sent to ${cleanTo}. SID: ${waId}`);
            const bodyText = typeof content === 'string'
                ? content
                : 'Interaction: ' + JSON.stringify(content);
            const msg = this.messageRepository.create({
                waId,
                from: 'SYSTEM',
                to: cleanTo,
                body: bodyText,
                direction: message_entity_1.MessageDirection.OUTBOUND,
            });
            await this.messageRepository.save(msg);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response) {
                this.logger.error(`Meta API Error: ${JSON.stringify(error.response.data)}`);
            }
            else {
                const message = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Error sending message: ${message}`);
            }
            throw error;
        }
    }
    async sendErrorMessage(to, message) {
        await this.sendWhatsappMessage(to, `❌ Error: ${message}`);
    }
    async sendOutboundMessage(to, body) {
        await this.sendWhatsappMessage(to, body);
        const msg = this.messageRepository.create({
            from: 'SYSTEM',
            to: to,
            body: body,
            direction: message_entity_1.MessageDirection.OUTBOUND,
            waId: `out_${Date.now()}`,
        });
        await this.messageRepository.save(msg);
        const lead = await this.leadsService.findByPhone(to);
        if (lead) {
            if (lead.status === lead_entity_1.LeadStatus.ASIGNADO) {
                await this.leadsService.updateStatus(lead.id, lead_entity_1.LeadStatus.CONTACTADO);
                this.logger.log(`Lead ${to} transition from ASIGNADO to CONTACTADO due to outbound message.`);
            }
        }
        return { status: 'sent', message: msg };
    }
    async getLatestChats() {
        return this.messageRepository
            .createQueryBuilder('message')
            .select('message.from', 'contact')
            .addSelect('COALESCE(leads.name, message.from)', 'name')
            .addSelect('message.body', 'lastMessage')
            .addSelect('message.created_at', 'timestamp')
            .innerJoin((qb) => {
            return qb
                .from(message_entity_1.Message, 'm2')
                .select('m2.from', 'f')
                .addSelect('MAX(m2.created_at)', 'max_ts')
                .groupBy('m2.from');
        }, 'latest', 'message.from = latest.f AND message.created_at = latest.max_ts')
            .leftJoin('leads', 'leads', 'leads.phone = message.from')
            .orderBy('message.created_at', 'DESC')
            .getRawMany();
    }
    async getMessageHistory(phone) {
        return this.messageRepository.find({
            where: [{ from: phone }, { to: phone }],
            order: { createdAt: 'ASC' },
            take: 100,
        });
    }
    buildSystemPrompt(config, leadName) {
        if (config.systemPrompt) {
            return config.systemPrompt;
        }
        const toneMap = {
            profesional: 'profesional y ejecutivo',
            amigable: 'cálido, amigable y accesible',
            casual: 'relajado, cercano y usando lenguaje informal',
            formal: 'muy formal y corporativo',
        };
        const toneStyle = toneMap[config.tone || 'profesional'] || 'profesional';
        let productsSection = '';
        if (config.products && config.products.length > 0) {
            productsSection = `\n\nPRODUCTOS/SERVICIOS DISPONIBLES:\n${config.products
                .map((p) => `- ${p.name}: ${p.description}${p.price ? ` (Precio: ${p.price})` : ''}`)
                .join('\n')}`;
        }
        let resourcesSection = '';
        if (config.brochureUrl) {
            resourcesSection += `\n- Si el prospecto pide más información, puedes compartir el brochure: ${config.brochureUrl}`;
        }
        if (config.websiteUrl) {
            resourcesSection += `\n- Sitio web para referencia: ${config.websiteUrl}`;
        }
        return `Eres Mabō, un asistente virtual de ventas. Tu estilo de comunicación es ${toneStyle}.
${leadName && leadName !== 'Prospecto WhatsApp'
            ? `\nEstás hablando con ${leadName}. Dirígete a esta persona por su nombre de manera natural (no en cada frase, pero sí al inicio o al despedirte).`
            : config.askForName
                ? '\nNo sabes el nombre del prospecto. TU PRIORIDAD ES PREGUNTAR SU NOMBRE antes de comenzar con la calificación. Hazlo de manera amable y natural, por ejemplo: "¡Hola! Soy el asistente virtual de Mabō OS. Para dirigirme a ti correctamente, ¿cuál es tu nombre?".'
                : '\nNo sabes el nombre del prospecto. Puedes preguntárselo si surge naturalmente, pero NO es obligatorio ni prioritario.'}

${config.businessContext ? `CONTEXTO DE LA EMPRESA:\n${config.businessContext}\n` : ''}
${productsSection}

OBJETIVO:
Debes guiar la conversación para obtener las siguientes respuestas del prospecto una por una:
${config.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

REGLAS CRÍTICAS:
1. Haz SOLO UNA PREGUNTA a la vez. Espera la respuesta.
2. Sé conciso y profesional.
3. Si el usuario responde con información relevante, avanza a la siguiente pregunta.
4. CUANDO HAYAS OBTENIDO TODAS LAS RESPUESTAS (verifica que tengas respuesta para cada una), DEBES finalizar tu mensaje con la etiqueta exacta "[COMPLETED]".
5. Usa el mensaje de cierre configurado para despedirte.

Ejemplo de respuesta final:
"${config.completionMessage} [COMPLETED]"
${resourcesSection}`;
    }
};
exports.WhatsappService = WhatsappService;
__decorate([
    (0, event_emitter_1.OnEvent)('advisor.otp_requested'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsappService.prototype, "handleOtpRequested", null);
exports.WhatsappService = WhatsappService = WhatsappService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [command_parser_service_1.CommandParser,
        advisors_service_1.AdvisorsService,
        assignments_service_1.AssignmentsService,
        leads_service_1.LeadsService,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService,
        typeorm_2.Repository,
        automations_service_1.AutomationsService,
        gemini_service_1.GeminiService])
], WhatsappService);
//# sourceMappingURL=whatsapp.service.js.map