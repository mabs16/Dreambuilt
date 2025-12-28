import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import Redis from 'ioredis';
import { ConnectionOptions } from 'tls';
import {
  CommandParser,
  CommandType,
  ParsedCommand,
} from './command-parser.service';
import { AdvisorsService } from '../../advisors/advisors.service';
import { Advisor } from '../../advisors/entities/advisor.entity';
import { AssignmentsService } from '../../assignments/assignments.service';
import { LeadsService } from '../../leads/leads.service';
import { Message, MessageDirection } from '../entities/message.entity';
import { AutomationsService } from './automations.service';
import { GeminiService } from './gemini.service';
import { LeadStatus } from '../../leads/entities/lead.entity';
import {
  LeadQualificationConfig,
  AdvisorAutomationConfig,
} from '../entities/automation.entity';

interface WhatsAppInteractive {
  type: string;
  body: { text: string };
  action: {
    buttons: Array<{
      type: string;
      reply: { id: string; title: string };
    }>;
  };
}

interface WhatsAppPayload {
  type: 'interactive' | 'text';
  interactive?: WhatsAppInteractive;
  text?: { body: string };
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private readonly redis: Redis;

  constructor(
    private readonly commandParser: CommandParser,
    private readonly advisorsService: AdvisorsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly leadsService: LeadsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly automationsService: AutomationsService,
    private readonly geminiService: GeminiService,
  ) {
    const redisConfig = this.configService.get('redis') as {
      host: string;
      port: number;
      password?: string;
      tls?: ConnectionOptions;
    };
    if (!redisConfig) {
      throw new Error('Redis configuration is missing');
    }
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      tls: redisConfig.tls,
    });
  }

  @OnEvent('advisor.otp_requested')
  async handleOtpRequested(payload: {
    name: string;
    phone: string;
    pin: string;
  }) {
    this.logger.log(`Evento OTP recibido para ${payload.phone}`);
    const message = `¡Hola ${payload.name}! Tu código de verificación para Mabō OS es: ${payload.pin}. Expira en 5 minutos.`;
    await this.sendWhatsappMessage(payload.phone, message);
  }

  async processIncomingMessage(
    from: string,
    body: string,
    waId?: string,
    profileName?: string,
  ) {
    if (!body) return;

    // Persist inbound message
    const msg = this.messageRepository.create({
      waId,
      from,
      to: 'SYSTEM',
      body,
      direction: MessageDirection.INBOUND,
    });
    await this.messageRepository.save(msg);

    try {
      const advisor = await this.advisorsService.findByPhone(from);

      if (advisor) {
        return await this.handleAdvisorMessage(advisor, from, body);
      }

      // Not an advisor, check if bot is active and handle as lead
      const isBotActive = await this.automationsService.isBotActive();
      if (isBotActive) {
        await this.handleLeadMessage(from, body, profileName);
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Error processing message from ${from}: ${err.message}`,
      );
      await this.sendErrorMessage(from, err.message);
    }
  }

  private async handleAdvisorMessage(
    advisor: Advisor,
    from: string,
    body: string,
  ) {
    // 1. Check if advisor is in a specific state (e.g., waiting for notes)
    const stateKey = `advisor_state:${from}`;
    const stateRaw = await this.redis.get(stateKey);

    // If it's a command, we prioritize parsing it even if in a state
    let parsed: ParsedCommand | null = null;
    try {
      parsed = this.commandParser.parse(body);
    } catch {
      // Not a command, proceed to state check or ignore
    }

    if (stateRaw && !parsed) {
      const state = JSON.parse(stateRaw) as {
        type: string;
        leadId: number;
        timestamp: number;
      };

      // Handle note submission
      if (state.type === 'WAITING_FOR_NOTES') {
        await this.leadsService.addNote({
          leadId: state.leadId,
          advisorId: advisor.id,
          content: body,
          type: 'MANUAL',
        });

        await this.redis.del(stateKey);

        // Get Advisor Automation Config
        const advAuto =
          await this.automationsService.getConfig('advisor_automation');
        const advConfig = advAuto?.config as AdvisorAutomationConfig;

        const successMsg = advConfig?.successNoteMessage
          ? advConfig.successNoteMessage.replace(
              /\{\{lead_id\}\}/g,
              String(state.leadId),
            )
          : `✅ Nota guardada para el Lead #${state.leadId}. ¡Gracias!`;

        await this.sendWhatsappMessage(from, successMsg);

        // Send next instructions
        const nextSteps = `*Próximos pasos sugeridos:*\n- Si el lead está en proceso, envía: \`${state.leadId} SEGUIMIENTO\`\n- Si agendaste cita, envía: \`${state.leadId} CITA\`\n- Para ver más info, envía: \`${state.leadId} INFO\``;
        await this.sendWhatsappMessage(from, nextSteps);
        return;
      }
    }

    if (!parsed) {
      // If it looks like a number followed by text, maybe it was meant as a command
      if (/^\d+\s+.*/.test(body)) {
        await this.sendWhatsappMessage(
          from,
          '❌ No entendí ese comando. Usa: `[ID] [COMANDO]`\nEjemplos: `123 CONTACTADO`, `123 CITA`, `123 INFO`',
        );
      } else {
        this.logger.debug(
          `Advisor ${advisor.name} sent a non-command message: ${body}`,
        );
      }
      return;
    }

    // 3. Validate Ownership
    const activeAssignment = await this.assignmentsService.findActiveAssignment(
      parsed.leadId,
    );
    if (
      !activeAssignment ||
      Number(activeAssignment.advisor_id) !== Number(advisor.id)
    ) {
      this.eventEmitter.emit('event.created', {
        lead_id: parsed.leadId,
        advisor_id: advisor.id,
        type: 'INVALID_OWNERSHIP_ATTEMPT',
        payload: { command: parsed.type, from },
      });
      throw new BadRequestException('Este Lead no está asignado a ti.');
    }

    // Get Advisor Automation Config for messages
    const advAuto =
      await this.automationsService.getConfig('advisor_automation');
    const advConfig = advAuto?.config as AdvisorAutomationConfig;

    // 4. Handle Commands
    switch (parsed.type) {
      case CommandType.ACTIVAR:
      case CommandType.INFO:
        await this.handleInfo(parsed.leadId, from);
        break;

      case CommandType.CONTACTADO: {
        this.eventEmitter.emit('command.contactado', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const contactadoMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `👍 Lead #${parsed.leadId} marcado como CONTACTADO.\n\nPor favor, escribe ahora una breve nota sobre este primer contacto:`;

        await this.sendWhatsappMessage(from, contactadoMsg);
        // Set state to wait for notes
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800, // 30 mins
        );
        break;
      }

      case CommandType.SEGUIMIENTO: {
        this.eventEmitter.emit('command.seguimiento', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const seguimientoMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `🔄 Lead #${parsed.leadId} ahora está en SEGUIMIENTO. ¿Alguna nota sobre el avance?`;

        await this.sendWhatsappMessage(from, seguimientoMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.CITA: {
        this.eventEmitter.emit('command.cita', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const citaMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `📅 CITA agendada para el Lead #${parsed.leadId}. ¡Excelente!\n\nPor favor, indica la fecha y detalles en una nota:`;

        await this.sendWhatsappMessage(from, citaMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.PERDIDO: {
        this.eventEmitter.emit('command.perdido', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const perdidoMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `📉 Lead #${parsed.leadId} marcado como PERDIDO. ¿Cuál fue el motivo? (Escribe una nota)`;

        await this.sendWhatsappMessage(from, perdidoMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.CIERRE: {
        this.eventEmitter.emit('command.cierre', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const cierreMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `🥳 ¡FELICIDADES! Lead #${parsed.leadId} marcado como CIERRE/CLIENTE.\n\nEscribe una nota final sobre la venta:`;

        await this.sendWhatsappMessage(from, cierreMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.INTENTO_CONTACTO: {
        const intentoMsg = advConfig?.notesPromptMessage
          ? advConfig.notesPromptMessage.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `📞 Intento de contacto registrado para el Lead #${parsed.leadId}. ¿Qué sucedió? (Escribe una nota)`;

        await this.sendWhatsappMessage(from, intentoMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.NOTAS:
        if (parsed.value) {
          await this.leadsService.addNote({
            leadId: parsed.leadId,
            advisorId: advisor.id,
            content: parsed.value,
            type: 'MANUAL',
          });

          const successMsg = advConfig?.successNoteMessage
            ? advConfig.successNoteMessage.replace(
                /\{\{lead_id\}\}/g,
                String(parsed.leadId),
              )
            : `✅ Nota guardada para el Lead #${parsed.leadId}.`;

          await this.sendWhatsappMessage(from, successMsg);
        } else {
          await this.sendWhatsappMessage(
            from,
            `📝 Escribe a continuación la nota que deseas agregar al Lead #${parsed.leadId}:`,
          );
          await this.redis.set(
            stateKey,
            JSON.stringify({
              type: 'WAITING_FOR_NOTES',
              leadId: parsed.leadId,
              timestamp: Date.now(),
            }),
            'EX',
            1800,
          );
        }
        break;

      default: {
        // Fallback for events if needed (parsed.type is exhausted here, so we cast to string)
        const typeStr = String(parsed.type);
        this.eventEmitter.emit(`command.${typeStr.toLowerCase()}`, {
          leadId: parsed.leadId,
          advisorId: advisor.id,
          value: parsed.value,
        });
      }
    }
  }

  private async handleLeadMessage(
    from: string,
    body: string,
    profileName?: string,
  ) {
    // Double check if this is an advisor (just in case)
    const isAdvisor = await this.advisorsService.findByPhone(from);
    if (isAdvisor) {
      this.logger.warn(
        `Unexpected: Advisor ${from} reaching handleLeadMessage. Skipping.`,
      );
      return;
    }

    let lead = await this.leadsService.findByPhone(from);

    // Determine the name to use
    const leadName = profileName || 'Prospecto WhatsApp';

    if (!lead) {
      lead = await this.leadsService.createLead({
        name: leadName,
        phone: from,
        source: 'WHATSAPP_BOT',
      });
      this.logger.log(`New lead created for bot: ${from} (Name: ${leadName})`);
    } else {
      // Update name if needed
      if (profileName && lead.name === 'Prospecto WhatsApp') {
        await this.leadsService.updateName(lead.id, profileName);
        lead.name = profileName;
        this.logger.log(`Lead ${from} name updated to: ${profileName}`);
      }
    }

    if (lead.status !== LeadStatus.NUEVO) {
      this.logger.debug(
        `Lead ${from} is not in NUEVO status, skipping bot logic.`,
      );
      return;
    }

    // --- WELCOME & BUTTON LOGIC ---
    if (body === 'START_QUALIFICATION') {
      // User clicked start, logic proceeds to AI
      // We transform the body so AI understands it naturally
      body = 'Hola, estoy listo para comenzar.';
    } else {
      // Check if we should enforce the button
      const lastSystemMsg = await this.messageRepository.findOne({
        where: { to: from, direction: MessageDirection.OUTBOUND },
        order: { createdAt: 'DESC' },
      });

      // Conditions to send welcome:
      // 1. No system messages ever (First contact)
      // 2. Last system message was the Welcome Button (User ignored button and typed text), so we persist.

      const isWelcomeMsg =
        lastSystemMsg && lastSystemMsg.body.includes('Presiona “Comenzar”');

      if (!lastSystemMsg || isWelcomeMsg) {
        await this.sendWelcomeMessage(from, lead.name);
        return; // Stop here, don't call AI
      }
      // If last message was something else (AI Question), we allow the user text to pass to AI
    }

    const automation = await this.automationsService.getConfig();
    if (!automation?.config || automation.name !== 'lead_qualification') {
      return;
    }

    const botConfig = automation.config as LeadQualificationConfig;

    // Get conversation history from Redis
    const historyKey = `bot_history:${from}`;
    const stateKey = `bot_state:${from}`;
    const historyRaw = await this.redis.get(historyKey);
    const history: { role: 'user' | 'model'; content: string }[] = historyRaw
      ? (JSON.parse(historyRaw) as {
          role: 'user' | 'model';
          content: string;
        }[])
      : [];

    // Add user message to history
    history.push({ role: 'user', content: body });

    // Build system prompt dynamically
    const systemPrompt = this.buildSystemPrompt(botConfig, lead.name);

    // Generate AI response
    const aiResponse = await this.geminiService.generateResponse(
      systemPrompt,
      history,
      body,
    );

    // DEBUG: Log AI response
    this.logger.debug(
      `[AI DEBUG] Phone: ${from} | User: ${body} | AI: ${aiResponse}`,
    );

    if (!aiResponse) {
      this.logger.error('Gemini returned empty response');
      await this.sendWhatsappMessage(
        from,
        'Lo siento, estoy pensando un poco más lento de lo normal. ¿Podrías repetirlo?',
      );
      return;
    }

    // Add AI response to history
    history.push({ role: 'model', content: aiResponse });

    // Save updated history
    await this.redis.set(historyKey, JSON.stringify(history), 'EX', 3600);

    // Check if completed
    let isCompleted = aiResponse.includes('[COMPLETED]');
    let cleanResponse = aiResponse;

    // Fallback Heuristics: If specific closure phrases are detected
    if (!isCompleted) {
      const lowerResp = aiResponse.toLowerCase();
      const closurePhrases = [
        'se pondrá en contacto',
        'he recibido tus datos',
        'gracias por la información',
        'gracias por tus respuestas',
      ];

      // Only trigger fallback if history has some depth (to avoid welcome message false positives)
      // and contains closure
      if (
        history.length > 2 &&
        closurePhrases.some((p) => lowerResp.includes(p))
      ) {
        this.logger.warn(
          `Fallback: Detected closure phrase in AI response. Marking as COMPLETED.`,
        );
        isCompleted = true;
      }
    }

    if (isCompleted) {
      cleanResponse = cleanResponse.replace('[COMPLETED]', '').trim();
      await this.sendWhatsappMessage(from, cleanResponse);

      await this.leadsService.updateStatus(lead.id, LeadStatus.PRECALIFICADO);
      this.logger.log(`Lead ${from} pre-calificado exitosamente via AI.`);

      // Automatic Assignment Logic
      try {
        const advisor = await this.advisorsService.findFirstAvailable();
        if (advisor) {
          await this.assignmentsService.createAssignment(lead.id, advisor.id);
          this.logger.log(
            `Lead ${from} assigned to advisor ${advisor.name} (${advisor.phone})`,
          );

          // Emit event to start SLA and other pipeline logic
          this.eventEmitter.emit('pipeline.assign', {
            leadId: lead.id,
            advisorId: advisor.id,
          });

          // Get Advisor Automation Config
          const advAuto =
            await this.automationsService.getConfig('advisor_automation');
          const advConfig = advAuto?.config as AdvisorAutomationConfig;
          this.logger.debug(`Advisor automation config found: ${!!advConfig}`);

          // Notify Advisor
          const historyRaw = await this.redis.get(historyKey);
          this.logger.debug(`History raw found: ${!!historyRaw}`);
          let summary = 'No hay historial.';
          if (historyRaw) {
            const history = JSON.parse(historyRaw) as Array<{
              role: 'user' | 'model';
              content: string;
            }>;
            if (advConfig?.useAiSummary) {
              this.logger.debug('Generating AI summary for advisor...');
              summary = await this.geminiService.summarizeLeadConversation(
                history,
                advConfig.aiSummaryPrompt || undefined,
              );
            } else {
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

          this.logger.debug(`Sending message to advisor ${advisor.phone}...`);
          try {
            if (advConfig?.enableInteractiveButtons !== false) {
              const payload: WhatsAppPayload = {
                type: 'interactive',
                interactive: {
                  type: 'button',
                  body: { text: advisorMsg.substring(0, 1024) },
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
              this.logger.debug(
                `Payload interactive: ${JSON.stringify(payload)}`,
              );
              await this.sendWhatsappMessage(advisor.phone, payload);
            } else {
              this.logger.debug(`Payload text: ${advisorMsg}`);
              await this.sendWhatsappMessage(
                advisor.phone,
                `${advisorMsg}\n\nEscribe \`${lead.id} CONTACTADO\` para empezar.`,
              );
            }
            this.logger.log(
              `Assignment notification sent to advisor ${advisor.phone}`,
            );
          } catch (notifyError: unknown) {
            const err = notifyError as Error;
            this.logger.error(
              `Failed to notify advisor ${advisor.phone}: ${err.message}`,
            );
          }

          // Cleanup lead state from Redis after assignment
          await this.redis.del(historyKey);
          await this.redis.del(stateKey);

          this.eventEmitter.emit('lead.prequalified', {
            leadId: lead.id,
            phone: from,
            advisorId: advisor.id,
          });
        }
      } catch (assignError: unknown) {
        const err = assignError as Error;
        this.logger.error(`Error during auto-assignment: ${err.message}`);
      }
    } else {
      await this.sendWhatsappMessage(from, aiResponse);
    }
  }

  private async handleInfo(leadId: number, from: string) {
    const lead = await this.leadsService.findById(leadId);
    const notes = await this.leadsService.getNotes(leadId);

    // Get pre-qualification history
    const historyKey = `bot_history:${lead.phone}`;
    const historyRaw = await this.redis.get(historyKey);
    let summary = 'No hay historial de precalificación.';

    if (historyRaw) {
      const history = JSON.parse(historyRaw) as Array<{
        role: string;
        content: string;
      }>;
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
${
  notes.length > 0
    ? notes
        .slice(0, 3)
        .map((n) => `- ${n.content}`)
        .join('\n')
    : 'Sin notas.'
}

Link: https://wa.me/${lead.phone}
`;
    await this.sendWhatsappMessage(from, info);
  }

  async sendWelcomeMessage(to: string, leadName?: string) {
    const automation = await this.automationsService.getConfig();
    const config =
      automation?.name === 'lead_qualification'
        ? (automation.config as LeadQualificationConfig)
        : null;

    let welcomeText =
      config?.welcomeMessage ||
      'Hola 👋\nSoy el asistente automático de Mabō OS.\n\nPara dirigir tu solicitud correctamente y evitar demoras, necesito hacerte 3 preguntas rápidas.\n\n👉 Presiona “Comenzar” para continuar.';
    const buttonText = config?.welcomeButtonText || 'Comenzar';

    // Personalization Logic
    if (leadName && leadName !== 'Prospecto WhatsApp' && leadName !== to) {
      if (welcomeText.includes('{{name}}')) {
        welcomeText = welcomeText.replace('{{name}}', leadName);
      } else if (welcomeText.toLowerCase().startsWith('hola')) {
        // Replace first "Hola" (case insensitive) with "Hola Name"
        welcomeText = welcomeText.replace(/Hola/i, `Hola ${leadName}`);
      }
    } else {
      // Clean up placeholder if name not available
      welcomeText = welcomeText.replace('{{name}}', '');
    }

    const payload: WhatsAppPayload = {
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

  public async sendWhatsappMessage(
    to: string,
    content: string | WhatsAppPayload,
  ) {
    const accessToken = this.configService.get<string>('whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    );
    const apiVersion =
      this.configService.get<string>('whatsapp.apiVersion') || 'v21.0';

    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        `WhatsApp credentials missing. Simulating send to ${to}`,
      );
      return;
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Clean phone number: remove any + or spaces (just in case)
    let cleanTo = to.replace(/\D/g, '');

    // Mexico Special Case: If it's a Mexican number (starts with 52)
    // and has 10 digits after 52, it needs a '1' between 52 and the number
    // for WhatsApp Cloud API to deliver it correctly to mobile numbers.
    if (
      cleanTo.startsWith('52') &&
      cleanTo.length === 12 &&
      cleanTo[2] !== '1'
    ) {
      cleanTo = '521' + cleanTo.substring(2);
      this.logger.debug(`Normalized Mexico number: ${to} -> ${cleanTo}`);
    }

    const payload: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
    };

    if (typeof content === 'string') {
      payload.type = 'text';
      payload.text = { body: content };
    } else if (content.type === 'interactive') {
      payload.type = 'interactive';
      payload.interactive = content.interactive;
    } else {
      // Fallback/Generic object merge
      Object.assign(payload, content);
    }

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      const waId = (response.data as { messages: Array<{ id: string }> })
        .messages[0].id;
      this.logger.log(`WhatsApp message sent to ${cleanTo}. SID: ${waId}`);

      // Persist outbound message
      const bodyText =
        typeof content === 'string'
          ? content
          : 'Interaction: ' + JSON.stringify(content);
      const msg = this.messageRepository.create({
        waId,
        from: 'SYSTEM',
        to: cleanTo,
        body: bodyText,
        direction: MessageDirection.OUTBOUND,
      });
      await this.messageRepository.save(msg);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Meta API Error: ${JSON.stringify(error.response.data)}`,
        );
      } else {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error sending message: ${message}`);
      }
      throw error;
    }
  }

  private async sendErrorMessage(to: string, message: string) {
    await this.sendWhatsappMessage(to, `❌ Error: ${message}`);
  }

  async sendOutboundMessage(to: string, body: string) {
    // 1. Send via WhatsApp API
    await this.sendWhatsappMessage(to, body);

    // 2. Persist message
    // Note: sendWhatsappMessage doesn't return the ID easily unless we parse response,
    // but for now we create a record to show it in history.
    const msg = this.messageRepository.create({
      from: 'SYSTEM', // Represents the advisor/bot
      to: to,
      body: body,
      direction: MessageDirection.OUTBOUND,
      waId: `out_${Date.now()}`,
    });
    await this.messageRepository.save(msg);

    // 3. Update Lead Status if applicable
    const lead = await this.leadsService.findByPhone(to);
    if (lead) {
      // Logic: If lead is ASIGNADO and an advisor (system) sends a message, it becomes CONTACTADO
      if (lead.status === LeadStatus.ASIGNADO) {
        await this.leadsService.updateStatus(lead.id, LeadStatus.CONTACTADO);
        this.logger.log(
          `Lead ${to} transition from ASIGNADO to CONTACTADO due to outbound message.`,
        );
      }
    }

    return { status: 'sent', message: msg };
  }

  async getLatestChats() {
    // More robust query for latest messages per contact using subquery
    return this.messageRepository
      .createQueryBuilder('message')
      .select('message.from', 'contact')
      .addSelect('COALESCE(leads.name, message.from)', 'name') // Use lead name if available, else phone
      .addSelect('message.body', 'lastMessage')
      .addSelect('message.created_at', 'timestamp')
      .addSelect('leads.avatar_url', 'avatar')
      .innerJoin(
        (qb) => {
          return qb
            .from(Message, 'm2')
            .select('m2.from', 'f')
            .addSelect('MAX(m2.created_at)', 'max_ts')
            .groupBy('m2.from');
        },
        'latest',
        'message.from = latest.f AND message.created_at = latest.max_ts',
      )
      .leftJoin('leads', 'leads', 'leads.phone = message.from')
      .orderBy('message.created_at', 'DESC')
      .getRawMany();
  }

  async getMessageHistory(phone: string) {
    return this.messageRepository.find({
      where: [{ from: phone }, { to: phone }],
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  private buildSystemPrompt(
    config: LeadQualificationConfig,
    leadName?: string,
  ): string {
    // Use custom system prompt if provided
    if (config.systemPrompt) {
      return config.systemPrompt;
    }

    // Build based on tone
    const toneMap: Record<string, string> = {
      profesional: 'profesional y ejecutivo',
      amigable: 'cálido, amigable y accesible',
      casual: 'relajado, cercano y usando lenguaje informal',
      formal: 'muy formal y corporativo',
    };
    const toneStyle = toneMap[config.tone || 'profesional'] || 'profesional';

    // Build products section
    let productsSection = '';
    if (config.products && config.products.length > 0) {
      productsSection = `\n\nPRODUCTOS/SERVICIOS DISPONIBLES:\n${config.products
        .map(
          (p) =>
            `- ${p.name}: ${p.description}${p.price ? ` (Precio: ${p.price})` : ''}`,
        )
        .join('\n')}`;
    }

    // Build resources section
    let resourcesSection = '';
    if (config.brochureUrl) {
      resourcesSection += `\n- Si el prospecto pide más información, puedes compartir el brochure: ${config.brochureUrl}`;
    }
    if (config.websiteUrl) {
      resourcesSection += `\n- Sitio web para referencia: ${config.websiteUrl}`;
    }

    return `Eres Mabō, un asistente virtual de ventas. Tu estilo de comunicación es ${toneStyle}.
${
  leadName && leadName !== 'Prospecto WhatsApp'
    ? `\nEstás hablando con ${leadName}. Dirígete a esta persona por su nombre de manera natural (no en cada frase, pero sí al inicio o al despedirte).`
    : config.askForName
      ? '\nNo sabes el nombre del prospecto. TU PRIORIDAD ES PREGUNTAR SU NOMBRE antes de comenzar con la calificación. Hazlo de manera amable y natural, por ejemplo: "¡Hola! Soy el asistente virtual de Mabō OS. Para dirigirme a ti correctamente, ¿cuál es tu nombre?".'
      : '\nNo sabes el nombre del prospecto. Puedes preguntárselo si surge naturalmente, pero NO es obligatorio ni prioritario.'
}

${config.businessContext ? `CONTEXTO DE LA EMPRESA:\n${config.businessContext}\n` : ''}
${productsSection}

OBJETIVO:
Debes guiar la conversación para obtener las siguientes respuestas del prospecto una por una:
${config.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

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
}
