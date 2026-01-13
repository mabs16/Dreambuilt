import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import axios from 'axios';
import Redis from 'ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConnectionOptions } from 'tls';
import {
  CommandParser,
  CommandType,
  ParsedCommand,
} from './command-parser.service';
import { AdvisorsService } from '../../advisors/services/advisors.service';
import { Advisor } from '../../advisors/entities/advisor.entity';
import { Assignment } from '../../assignments/entities/assignment.entity';
import { AssignmentsService } from '../../assignments/services/assignments.service';
import { LeadsService } from '../../leads/services/leads.service';
import { Message, MessageDirection } from '../entities/message.entity';
import { AutomationsService } from './automations.service';
import { GeminiService } from './gemini.service';
import { LeadStatus, Lead } from '../../leads/entities/lead.entity';
import { FlowsService } from '../../flows/services/flows.service';
import { FlowSession } from '../../flows/entities/flow-session.entity';
import {
  LeadQualificationConfig,
  AdvisorAutomationConfig,
  MessageConfig,
} from '../entities/automation.entity';

// Interfaces for Flow Engine
interface FlowNode {
  id: string;
  type: string;
  data: {
    label?: string;
    variable?: string;
    [key: string]: any;
  };
  position?: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: any;
}

interface WhatsAppInteractive {
  type: string;
  header?: {
    type: 'image' | 'document' | 'video' | 'text';
    image?: { link: string };
    document?: { link: string; filename?: string };
    video?: { link: string };
    text?: string;
  };
  body: { text: string };
  action: {
    buttons: Array<{
      type: string;
      reply: { id: string; title: string };
    }>;
  };
}

interface WhatsAppPayload {
  type: 'interactive' | 'text' | 'image' | 'document';
  interactive?: WhatsAppInteractive;
  text?: { body: string };
  image?: { link: string; caption?: string };
  document?: { link: string; caption?: string; filename?: string };
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
    private readonly flowsService: FlowsService,
    @InjectRepository(FlowSession)
    private readonly flowSessionsRepository: Repository<FlowSession>,
  ) {
    const redisConfig = this.configService.get('redis') as {
      host: string;
      port: number;
      password?: string;
      tls?: ConnectionOptions;
    };

    if (!redisConfig || !redisConfig.host) {
      this.logger.error(
        '❌ Redis configuration is missing or incomplete (host not defined). Scheduled messages and state persistence will NOT work.',
      );
      // We initialize with empty object which defaults to localhost, but we log the error.
      // In production this might be fatal, but for debugging we want the app to start.
    } else {
      this.logger.log(
        `✅ Redis configuration found: ${redisConfig.host}:${redisConfig.port}`,
      );
    }

    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      tls: redisConfig?.tls,
      maxRetriesPerRequest: null, // Recommended for BullMQ/some use cases
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.redis.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleScheduledMessages() {
    this.logger.log('⏰ Running daily scheduled messages check at 9 AM...');

    // Find sessions scheduled for today or earlier (in case of missed runs)
    const now = new Date();
    const scheduledSessions = await this.flowSessionsRepository.find({
      where: {
        status: 'ACTIVE',
        scheduled_for: LessThanOrEqual(now),
      },
      relations: ['flow', 'lead'],
    });

    if (scheduledSessions.length === 0) {
      this.logger.log('No scheduled messages found for today.');
      return;
    }

    this.logger.log(`Found ${scheduledSessions.length} sessions to resume.`);

    for (const session of scheduledSessions) {
      try {
        this.logger.log(
          `Resuming session ${session.id} for lead ${session.lead_id}`,
        );

        // Clear schedule to avoid double processing
        session.scheduled_for = null;
        await this.flowSessionsRepository.save(session);

        // Resume flow execution
        // We need to find the next node after the wait node
        const flow = session.flow;
        if (!flow || !flow.nodes || !flow.edges) {
          this.logger.warn(`Flow data missing for session ${session.id}`);
          continue;
        }

        const currentNodeId = session.current_node_id;
        // Find edge from current wait node
        const edge = flow.edges.find((e: any) => e.source === currentNodeId);

        if (edge) {
          const nextNodeId = String(edge.target);
          await this.flowsService.updateSessionNode(session.id, nextNodeId);

          // Refresh session with updated data
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow; // Re-attach flow data
            await this.executeFlowStep(
              updatedSession,
              '',
              String(session.lead.phone),
            );
          }
        } else {
          this.logger.log(
            `No next node found for session ${session.id}, completing.`,
          );
          await this.flowsService.completeSession(session.id);
        }
      } catch (error) {
        this.logger.error(
          `Error resuming session ${session.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  @OnEvent('advisor.otp_requested')
  async handleOtpRequested(payload: {
    name: string;
    phone: string;
    pin: string;
  }) {
    this.logger.log(`Evento OTP recibido para ${payload.phone}`);
    const message = `¡Hola ${payload.name}! Tu código de verificación para Dreambuilt OS es: ${payload.pin}. Expira en 5 minutos.`;
    await this.sendWhatsappMessage(payload.phone, message);
  }

  @OnEvent('assignment.reassigned')
  async handleReassignment(payload: {
    leadId: number;
    advisorId: number;
    oldAdvisorId: number;
    advisorName: string;
    advisorPhone: string;
  }) {
    this.logger.log(
      `Handling reassignment notification for lead ${payload.leadId} to advisor ${payload.advisorName}`,
    );

    try {
      const lead = await this.leadsService.findById(payload.leadId);

      // Get Automation Config
      const automation =
        await this.automationsService.getConfig('advisor_automation');
      const config = automation?.config as AdvisorAutomationConfig;

      let message =
        '⚠️ *LEAD REASIGNADO*\n\nEl lead {{lead_name}} te ha sido reasignado.';
      let buttonsConfig = [
        { action: 'INFO', label: 'ℹ️ VER INFO', enabled: true },
        { action: 'REJECT', label: '⛔ NO PUEDO ATENDER', enabled: true },
      ];

      // Use Reassignment Config
      if (config?.reassignment) {
        message = config.reassignment.message;
        if (
          config.reassignment.buttons &&
          config.reassignment.buttons.length > 0
        ) {
          buttonsConfig = config.reassignment.buttons;
        }
      }

      // Replace variables
      message = message
        .replace(/\{\{lead_id\}\}/g, String(lead.id))
        .replace(/\{\{lead_name\}\}/g, lead.name)
        .replace(/\{\{phone\}\}/g, lead.phone);

      // Prepare Buttons
      const buttons = buttonsConfig
        .filter((b) => b.enabled)
        .map((b) => ({
          type: 'reply',
          reply: {
            id: `${lead.id} ${b.action}`,
            title: b.label.substring(0, 20), // WhatsApp limit
          },
        }));

      // Send Message
      if (config?.enableInteractiveButtons !== false && buttons.length > 0) {
        const payloadMsg: WhatsAppPayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: message },
            action: { buttons: buttons as any },
          },
        };
        await this.sendWhatsappMessage(payload.advisorPhone, payloadMsg);
      } else {
        await this.sendWhatsappMessage(payload.advisorPhone, message);
      }
    } catch (error) {
      this.logger.error(
        `Error sending reassignment message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  @OnEvent('assignment.created')
  async handleAssignmentCreated(payload: {
    assignment: Assignment;
    source: 'SYSTEM' | 'MANUAL' | 'REASSIGNMENT';
  }) {
    // Ignore REASSIGNMENT as it is handled by handleReassignment to avoid double notification
    if (payload.source === 'REASSIGNMENT') {
      return;
    }

    const { lead_id: leadId, advisor_id: advisorId } = payload.assignment;
    this.logger.log(
      `Handling assignment notification (Source: ${payload.source}) for lead ${leadId} to advisor ${advisorId}`,
    );

    try {
      const lead = await this.leadsService.findById(leadId);
      const advisor = await this.advisorsService.findById(advisorId);

      if (!advisor || !advisor.phone) {
        this.logger.warn(`Advisor ${advisorId} not found or has no phone`);
        return;
      }

      // Get Automation Config
      const automation =
        await this.automationsService.getConfig('advisor_automation');
      const config = automation?.config as AdvisorAutomationConfig;
      const responseLimit = config?.responseTimeLimitMinutes || 15;

      // Get Summary if available (last system summary note)
      const notes = await this.leadsService.getNotes(leadId);
      const summaryNote = notes.find((n) => n.type === 'SYSTEM_SUMMARY');
      const summary = summaryNote ? summaryNote.content : 'Sin resumen previo.';

      let message = '';
      let buttonsConfig = [
        { action: 'INFO', label: 'ℹ️ VER INFO', enabled: true },
        { action: 'REJECT', label: '⛔ NO PUEDO ATENDER', enabled: true },
      ];

      if (payload.source === 'SYSTEM') {
        message = `🔔 *NUEVO LEAD ASIGNADO*\n\nℹ️ Presiona el botón de ver info para obtener detalles.\n\n⚠️ *URGENCIA:* Debes responder en menos de ${responseLimit} min. o será reasignado.`;
        if (config?.systemAssignment) {
          message = config.systemAssignment.message;
          if (
            config.systemAssignment.buttons &&
            config.systemAssignment.buttons.length > 0
          ) {
            buttonsConfig = config.systemAssignment.buttons;
          }
        }
      } else {
        // MANUAL
        message =
          '👤 *TE HAN ASIGNADO UN LEAD MANUALMENTE*\n\nHola, se te ha asignado el lead {{lead_name}} ({{phone}}) manualmente.';
        if (config?.manualAssignment) {
          message = config.manualAssignment.message;
          if (
            config.manualAssignment.buttons &&
            config.manualAssignment.buttons.length > 0
          ) {
            buttonsConfig = config.manualAssignment.buttons;
          }
        }
      }

      // Replace variables
      message = message
        .replace(/\{\{lead_id\}\}/g, String(lead.id))
        .replace(/\{\{lead_name\}\}/g, lead.name)
        .replace(/\{\{phone\}\}/g, lead.phone)
        .replace(/\{\{summary\}\}/g, summary)
        .replace(/\{\{response_limit\}\}/g, String(responseLimit));

      // Prepare Buttons
      const buttons = buttonsConfig
        .filter((b) => b.enabled)
        .map((b) => ({
          type: 'reply',
          reply: {
            id: `${lead.id} ${b.action}`,
            title: b.label.substring(0, 20), // WhatsApp limit
          },
        }));

      // Send Message
      if (config?.enableInteractiveButtons !== false && buttons.length > 0) {
        const payloadMsg: WhatsAppPayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: message },
            action: { buttons: buttons as any },
          },
        };
        await this.sendWhatsappMessage(advisor.phone, payloadMsg);
      } else {
        await this.sendWhatsappMessage(
          advisor.phone,
          `${message}\n\nEscribe \`${lead.id} INFO\` para ver detalles.`,
        );
      }
      this.logger.log(
        `Assignment notification sent to advisor ${advisor.phone} via ${payload.source} flow`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle assignment creation notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async processIncomingMessage(
    from: string,
    body: string,
    waId?: string,
    profileName?: string,
    buttonId?: string,
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
      let advisor = await this.advisorsService.findByPhone(from);

      // Try alternate format for Mexico numbers (521 vs 52)
      if (!advisor && from.startsWith('52') && from.length > 10) {
        const is521 = from.startsWith('521');
        const altPhone = is521
          ? '52' + from.substring(3)
          : '521' + from.substring(2);
        advisor = await this.advisorsService.findByPhone(altPhone);
        if (advisor) {
          this.logger.log(
            `Advisor found via alternate phone format: ${altPhone}`,
          );
        }
      }

      if (advisor) {
        return await this.handleAdvisorMessage(advisor, from, body, buttonId);
      }

      // Not an advisor, check if bot is active and handle as lead
      const isBotActive = await this.automationsService.isBotActive();
      this.logger.log(`Is bot active: ${isBotActive}`);

      // --- FLOW ENGINE LOGIC ---
      let lead = await this.leadsService.findByPhone(from);
      if (!lead) {
        // Create lead if not exists (needed for session)
        lead = await this.leadsService.createLead({
          name: profileName || 'Prospecto WhatsApp',
          phone: from,
          source: 'WHATSAPP_BOT',
        });
        this.logger.log(`Created new lead: ${lead.id} for phone: ${from}`);
      }

      // Associate message with lead
      if (lead) {
        msg.lead = lead;
        await this.messageRepository.save(msg);
      }

      if (isBotActive) {
        // 1. Check if user is in an active Flow Session
        const activeSession = await this.flowsService.getActiveSession(lead.id);

        if (activeSession) {
          this.logger.log(
            `Active flow session found for ${from}. SessionID: ${activeSession.id}`,
          );
          // Execute next step in flow
          await this.executeFlowStep(activeSession, body, from, buttonId);
          return;
        }

        // 2. Check if message triggers a new Flow (Keywords)
        const flow = await this.flowsService.findByKeyword(
          body.toLowerCase().trim(),
        );
        this.logger.log(
          `Checking keywords for: "${body.toLowerCase().trim()}". Flow found: ${flow?.name || 'none'}`,
        );
        if (flow) {
          this.logger.log(`Flow triggered: ${flow.name} for ${from}`);

          // Cast jsonb to array
          const nodes = flow.nodes as unknown as FlowNode[];
          const startNode =
            nodes.find((n) => n.type === 'input' || n.type === 'trigger') ||
            nodes[0];

          if (startNode) {
            const session = await this.flowsService.createSession(
              lead.id,
              flow.id,
              startNode.id,
            );
            // Ensure session has the flow object attached for execution
            session.flow = flow;
            await this.executeFlowStep(session, body, from, buttonId);
            return;
          }
        }

        // 3. Fallback to Legacy Bot Logic
        await this.handleLeadMessage(from, body, profileName, buttonId);
      }
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Error processing message from ${from}: ${err.message}`,
      );
      await this.sendErrorMessage(from, err.message);
    }
  }

  // --- FLOW ENGINE EXECUTOR ---
  private async executeFlowStep(
    session: FlowSession,
    userMessage: string,
    from: string,
    buttonId?: string,
  ) {
    const flow = session.flow;
    const currentNodeId = session.current_node_id;
    const nodes = (flow.nodes || []) as unknown as FlowNode[];
    const edges = (flow.edges || []) as unknown as FlowEdge[];

    const currentNode = nodes.find((n) => n.id === currentNodeId);

    if (!currentNode) {
      this.logger.error(`Node ${currentNodeId} not found in flow ${flow.id}`);
      await this.flowsService.completeSession(session.id);
      return;
    }

    this.logger.log(
      `Executing node ${currentNodeId} [${currentNode.type || 'no-type'}] (data.type: ${currentNode.data?.type || 'no-data-type'}) for lead ${session.lead_id}`,
    );

    // 0. Check if node is "ConectarFlujo" (Jump to Flow)
    const isJumpNode =
      currentNode.type === 'ConectarFlujo' ||
      currentNode.data?.type === 'ConectarFlujo' ||
      (currentNode.data?.label &&
        currentNode.data.label.includes('Conectar Flujo:'));

    if (isJumpNode) {
      const targetFlowId = currentNode.data?.targetFlowId;
      if (targetFlowId) {
        this.logger.log(
          `🔗 Jump Node detected: Redirecting lead ${session.lead_id} to flow ${targetFlowId}`,
        );

        const targetFlow = await this.flowsService.findOne(
          Number(targetFlowId),
        );
        if (targetFlow) {
          const targetNodes = targetFlow.nodes as unknown as FlowNode[];
          const startNode =
            targetNodes.find(
              (n) => n.type === 'input' || n.type === 'trigger',
            ) || targetNodes[0];

          if (startNode) {
            // Update current session to the new flow and its start node
            await this.flowsService.updateSessionNode(
              session.id,
              startNode.id,
              undefined,
              targetFlow.id,
            );

            // Re-fetch to get updated session with new flow
            const updatedSession = await this.flowsService.findOneSession(
              session.id,
            );
            if (updatedSession) {
              updatedSession.flow = targetFlow;
              // Recursive call to start the new flow
              return await this.executeFlowStep(updatedSession, '', from);
            }
          }
        }
      }
      this.logger.warn(
        `Jump node ${currentNodeId} failed to redirect. Completing session.`,
      );
      await this.flowsService.completeSession(session.id);
      return;
    }

    // 1. Process User Input (if we are waiting for an answer)
    const isWaiting = session.variables?._waiting_for_input === true;

    if (isWaiting) {
      // User just answered the question of 'currentNode'
      if (currentNode.data && currentNode.data.variable) {
        const varName = currentNode.data.variable;

        // SPECIAL CASE: If variable is 'name', update the lead name in database
        if (varName === 'name') {
          try {
            await this.leadsService.updateName(session.lead_id, userMessage);
            this.logger.log(
              `Updated lead ${session.lead_id} name to: ${userMessage}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to update lead name: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        // SPECIAL CASE: If variable is 'email', update the lead email in database
        if (varName === 'email') {
          try {
            await this.leadsService.updateEmail(session.lead_id, userMessage);
            this.logger.log(
              `Updated lead ${session.lead_id} email to: ${userMessage}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to update lead email: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }

        await this.flowsService.updateSessionVariables(session.id, {
          [varName]: userMessage,
          _waiting_for_input: false,
        });
        this.logger.log(`Saved variable ${varName} = ${userMessage}`);
      } else {
        // Just clear waiting flag if no variable defined
        await this.flowsService.updateSessionVariables(session.id, {
          _waiting_for_input: false,
        });
      }
    } else {
      // Check if node is "Espera" (Wait) - Robust detection
      const isWaitNode =
        currentNode.type === 'Espera' ||
        currentNode.data?.type === 'Espera' ||
        currentNode.type?.toLowerCase() === 'espera' ||
        currentNode.data?.type?.toLowerCase() === 'espera' ||
        (currentNode.data?.label &&
          (currentNode.data.label.toLowerCase().includes('espera:') ||
            currentNode.data.label.includes('⏳')));

      if (isWaitNode) {
        // NEW: Check for Scheduled Wait Mode (Days + 9 AM)
        const isScheduled = currentNode.data?.scheduledMode === true;

        if (isScheduled) {
          const daysToWait = (currentNode.data?.waitDays as number) || 1;

          // Calculate target date
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + daysToWait);
          // Set time to 9:00 AM
          targetDate.setHours(9, 0, 0, 0);

          this.logger.log(
            `📅 Scheduled Wait Node detected for lead ${session.lead_id}. Waiting ${daysToWait} days until ${targetDate.toISOString()}`,
          );

          // Save scheduled date to session and stop execution
          session.scheduled_for = targetDate;
          await this.flowSessionsRepository.save(session);

          return; // STOP EXECUTION HERE. Cron job will pick it up later.
        }

        // Standard Delay Mode (existing logic)
        const waitTime = (currentNode.data?.waitTime as number) || 5;
        const waitUnit = (currentNode.data?.waitUnit as string) || 'seconds';
        const delayMs =
          waitUnit === 'minutes' ? waitTime * 60 * 1000 : waitTime * 1000;

        this.logger.log(
          `⏳ Wait Node detected for lead ${session.lead_id}: ${waitTime} ${waitUnit} (${delayMs}ms)`,
        );

        // Move to next node immediately after delay
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;

          // Use setTimeout to delay the execution of the next step
          setTimeout(() => {
            void (async () => {
              try {
                this.logger.log(
                  `⏰ Delay finished for lead ${session.lead_id}. Moving to node ${nextNodeId}`,
                );
                await this.flowsService.updateSessionNode(
                  session.id,
                  nextNodeId,
                );
                const updatedSession = await this.flowsService.findOneSession(
                  session.id,
                );
                if (updatedSession) {
                  updatedSession.flow = flow;
                  // Recursive call after delay
                  await this.executeFlowStep(updatedSession, '', from);
                }
              } catch (error) {
                this.logger.error(
                  `Error after wait delay: ${error instanceof Error ? error.message : String(error)}`,
                );
              }
            })();
          }, delayMs);

          return; // IMPORTANT: Stop current execution, setTimeout will pick it up
        } else {
          this.logger.warn(
            `Wait node ${currentNodeId} has no outgoing edge. Completing session.`,
          );
          await this.flowsService.completeSession(session.id);
          return;
        }
      }

      // We just arrived at this node. Execute its action.
      let messageToSend = currentNode.data?.label || '';

      // Robust cleaning of node labels
      // 1. Remove prefixes including emojis if present
      messageToSend = messageToSend
        .replace(
          /^\s*((💬|❓|⚡|🤖|🏷️|⏳|📊|👤|📧)\s*)?(Enviar Mensaje|Mensaje|Pregunta|IA Action|IA|Etiqueta|Tag|Condición|Pipeline|Asignación|Espera|Solicitar Nombre|Solicitar Email|Acción IA):\s*[\r\n]*/iu,
          '',
        )
        .replace(/^\s*(💬|❓|⚡|🤖|🏷️|⏳|📊|👤|📧)\s*/iu, '') // Remove leftover emojis at start
        .trim();

      // 2. Variable Substitution (e.g., {{name}})
      const lead = await this.leadsService.findById(session.lead_id);

      // Check if node is "Condición"
      if (
        currentNode.type === 'Condición' ||
        currentNode.data?.type === 'Condición' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('condición:'))
      ) {
        this.logger.log(`Executing Condition Node for lead ${session.lead_id}`);
        const label = (currentNode.data?.label as string) || '';
        let conditionMet = false;

        if (label.includes('¿Tiene nombre')) {
          // Check if lead has a real name (not 'Prospecto WhatsApp' or similar)
          const name = lead?.name || '';
          conditionMet =
            name.length > 0 &&
            !name.toLowerCase().includes('prospecto') &&
            !name.toLowerCase().includes('whatsapp');
          this.logger.log(
            `Condition "Has Name" check: ${conditionMet} (Name: ${name})`,
          );
        } else if (label.includes('contiene')) {
          // Check if message contains keyword
          const match = label.match(/'([^']+)'/);
          const keyword = match ? match[1].toLowerCase() : '';
          conditionMet = userMessage.toLowerCase().includes(keyword);
          this.logger.log(
            `Condition "Contains '${keyword}'" check: ${conditionMet}`,
          );
        } else if (label.includes('{{brochure_enviado}}')) {
          // Check if brochure_enviado variable is true
          const isSent =
            session.variables?.['brochure_enviado'] === true ||
            session.variables?.['brochure_enviado'] === 'true';
          conditionMet = isSent;
          this.logger.log(
            `Condition "Brochure Enviado" check: ${conditionMet} (Value: ${session.variables?.['brochure_enviado']})`,
          );
        }

        // Routing logic for Condition
        let nextNodeId: string | null = null;
        if (conditionMet) {
          // Use main handle (sourceHandle === 'main' or null)
          const edge = edges.find(
            (e) =>
              e.source === currentNodeId &&
              (e.sourceHandle === 'main' || !e.sourceHandle),
          );
          nextNodeId = edge?.target || null;
        } else {
          // Use the "False" handle (button or explicit false handle)
          const edge = edges.find(
            (e) =>
              e.source === currentNodeId &&
              e.sourceHandle &&
              (e.sourceHandle.startsWith('btn-') || e.sourceHandle === 'false'),
          );
          nextNodeId = edge?.target || null;
        }

        if (nextNodeId) {
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            return await this.executeFlowStep(
              updatedSession,
              userMessage,
              from,
            );
          }
        } else {
          this.logger.warn(
            `No next node found for condition result: ${conditionMet}`,
          );
          await this.flowsService.completeSession(session.id);
          return;
        }
      }

      if (lead) {
        messageToSend = messageToSend.replace(
          /{{name}}/gi,
          lead.name || 'Cliente',
        );
        messageToSend = messageToSend.replace(/{{phone}}/gi, lead.phone || '');
        // Dynamic variable replacement from session variables
        if (session.variables) {
          Object.entries(session.variables).forEach(([key, value]) => {
            if (key !== '_waiting_for_input') {
              const regex = new RegExp(`{{${key}}}`, 'gi');
              messageToSend = messageToSend.replace(regex, String(value));
            }
          });
        }
      }

      // Special handling for trigger nodes to avoid sending technical text
      if (
        currentNode.type === 'input' ||
        currentNode.type === 'trigger' ||
        messageToSend.toLowerCase().startsWith('inicio:')
      ) {
        this.logger.log('Skipping message sending for trigger node');
        messageToSend = '';
      }

      // Check if node is "IA" (AI Action)
      // Logic: Perform AI analysis/action, do NOT send raw message to WhatsApp
      if (
        currentNode.type === 'IA' ||
        currentNode.data?.type === 'IA' ||
        currentNode.type === 'IA Action' ||
        currentNode.data?.type === 'IA Action' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('ia action:'))
      ) {
        // Redirigir a la lógica de ejecución de IA que está más abajo
        this.logger.log(
          `Routing to IA Execution logic for lead ${session.lead_id}`,
        );
      } else if (
        currentNode.type === 'Etiqueta' ||
        currentNode.data?.type === 'Tag' || // Check explicit type from data
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('etiqueta:'))
      ) {
        const labelText = currentNode.data?.label || '';
        // Extract tag name
        const tag = labelText
          .replace(/^((💬|❓|⚡|🤖|🏷️)\s*)?(Etiqueta|Tag):\s*/iu, '')
          .trim();

        if (tag) {
          this.logger.log(`Applying tag "${tag}" to lead ${session.lead_id}`);
          // Implement actual tagging logic in LeadsService
          await this.leadsService.addTag(session.lead_id, tag);
        }

        // Move to next node immediately without sending message
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            await this.executeFlowStep(updatedSession, '', from);
          }
        } else {
          await this.flowsService.completeSession(session.id);
        }
        return;
      }

      // Check if node is "Pipeline" (PipelineUpdate)
      if (
        currentNode.type === 'Pipeline' ||
        currentNode.data?.type === 'Pipeline' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('pipeline:'))
      ) {
        this.logger.log(`Executing Pipeline Node for lead ${session.lead_id}`);

        // Determine status from node label
        const label = (currentNode.data?.label as string) || '';
        let targetStatus = LeadStatus.PRECALIFICADO;

        if (label.toLowerCase().includes('asignado')) {
          targetStatus = LeadStatus.ASIGNADO;
        } else if (label.toLowerCase().includes('nutricion')) {
          targetStatus = LeadStatus.NUTRICION;
        }

        // 1. Update Status
        await this.leadsService.updateStatus(session.lead_id, targetStatus);

        // 2. ONLY Status Update (Assignment moved to separate node)
        this.logger.log(
          `Lead ${session.lead_id} status updated to ${targetStatus}`,
        );

        // Move to next node immediately without sending message
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            await this.executeFlowStep(updatedSession, '', from);
          }
        } else {
          await this.flowsService.completeSession(session.id);
        }
        return;
      }

      // Check if node is "Asignación" (Assignment)
      if (
        currentNode.type === 'Asignación' ||
        currentNode.data?.type === 'Asignación' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('asignación:'))
      ) {
        this.logger.log(
          `Executing Assignment Node for lead ${session.lead_id}`,
        );

        // 1. Determine Assignment Strategy
        const label = (currentNode.data?.label as string) || '';
        const assignmentType = currentNode.data?.assignmentType || '';
        let advisor: Advisor | null = null;

        if (
          assignmentType === 'MANUAL' ||
          label.toLowerCase().includes('manual')
        ) {
          // --- MANUAL ASSIGNMENT ---
          // 1. Try to get ID from data (New Way)
          if (currentNode.data?.manualAdvisorId) {
            const advisorId = Number(currentNode.data.manualAdvisorId);
            advisor = await this.advisorsService.findById(advisorId);
          }

          // 2. Fallback: Extract ID from label (Old Way)
          if (!advisor) {
            const idMatch = label.match(/\(ID:\s*(\d+)\)/);
            if (idMatch && idMatch[1]) {
              const advisorId = parseInt(idMatch[1], 10);
              advisor = await this.advisorsService.findById(advisorId);
            }
          }

          // 3. Fallback: Search by name from label (Old Way)
          if (!advisor) {
            const parts = label.split('Manual:');
            if (parts.length > 1) {
              const advisorName = parts[1].replace(/\(ID:\s*\d+\)/, '').trim();
              const allAdvisors = await this.advisorsService.findAll();

              // Exact match
              advisor =
                allAdvisors.find(
                  (a) => a.name.toLowerCase() === advisorName.toLowerCase(),
                ) || null;

              // Fuzzy match
              if (!advisor) {
                const targetName = advisorName.toLowerCase();
                advisor =
                  allAdvisors.find((a) => {
                    const aName = a.name.toLowerCase();
                    return (
                      aName.includes(targetName) || targetName.includes(aName)
                    );
                  }) || null;
              }
            }
          }
        } else if (assignmentType === 'ROUND_ROBIN') {
          // --- ROUND ROBIN ---
          advisor =
            await this.assignmentsService.findBestAdvisorForAssignment(
              'ROUND_ROBIN',
            );
        } else {
          // --- QUOTA DEFICIT (Hybrid) ---
          // Default behavior if 'QUOTA_DEFICIT' or unspecified
          advisor =
            await this.assignmentsService.findBestAdvisorForAssignment(
              'QUOTA_DEFICIT',
            );
        }

        if (advisor) {
          // 2. Retrieve AI Summary if exists
          const aiSummary =
            (session.variables?.['ai_summary'] as string) ||
            'Sin resumen previo.';

          this.eventEmitter.emit('pipeline.assign', {
            leadId: session.lead_id,
            advisorId: advisor.id,
            summary: aiSummary, // Pass summary to event handler
          });
          this.logger.log(
            `Assigned lead ${session.lead_id} to advisor ${advisor.id}`,
          );

          // Save Summary as Note only if it's not already "Sin resumen previo"
          // In Flow Engine, the IA node should have already created this.
          // Check if a SYSTEM_SUMMARY already exists for this lead
          const existingNotes = await this.leadsService.getNotes(
            session.lead_id,
          );
          const hasSummary = existingNotes.some(
            (n) => n.type === 'SYSTEM_SUMMARY',
          );

          if (aiSummary && aiSummary !== 'Sin resumen previo.' && !hasSummary) {
            await this.leadsService.addNote({
              leadId: session.lead_id,
              advisorId: advisor.id,
              content: `RESUMEN IA INICIAL:\n${aiSummary}`,
              type: 'SYSTEM_SUMMARY',
            });
          }

          // --- NOTIFY ADVISOR START ---
          try {
            const lead = await this.leadsService.findById(session.lead_id);
            if (lead && advisor.phone) {
              // Get Advisor Automation Config
              const advAuto =
                await this.automationsService.getConfig('advisor_automation');
              const advConfig = advAuto?.config as AdvisorAutomationConfig;

              const responseLimit = advConfig?.responseTimeLimitMinutes || 15;

              // MENSAJE 1: ALERTA INICIAL (SYSTEM ASSIGNMENT)
              let alertMsg = `🔔 *NUEVO LEAD ASIGNADO*\n\nℹ️ Presiona el botón de ver info para obtener detalles.\n\n⚠️ *URGENCIA:* Debes responder en menos de ${responseLimit} min. o será reasignado.`;
              let buttonsConfig = [
                { action: 'INFO', label: 'ℹ️ VER INFO LEAD', enabled: true },
              ];

              // 1. Try New Config (System Assignment)
              if (advConfig?.systemAssignment) {
                alertMsg = advConfig.systemAssignment.message
                  .replace(/\{\{lead_id\}\}/g, String(lead.id))
                  .replace(/\{\{lead_name\}\}/g, lead.name)
                  .replace(/\{\{phone\}\}/g, from)
                  .replace(/\{\{summary\}\}/g, aiSummary)
                  .replace(/\{\{response_limit\}\}/g, String(responseLimit));

                if (
                  advConfig.systemAssignment.buttons &&
                  advConfig.systemAssignment.buttons.length > 0
                ) {
                  buttonsConfig = advConfig.systemAssignment.buttons;
                }
              }
              // 2. Fallback to Legacy Config
              else if (advConfig?.assignmentMessage) {
                alertMsg = advConfig.assignmentMessage
                  .replace(/\{\{lead_id\}\}/g, String(lead.id))
                  .replace(/\{\{lead_name\}\}/g, lead.name)
                  .replace(/\{\{phone\}\}/g, from)
                  .replace(/\{\{summary\}\}/g, aiSummary)
                  .replace(/\{\{response_limit\}\}/g, String(responseLimit));
              }

              this.logger.debug(
                `Sending message to advisor ${advisor.phone}...`,
              );
              if (advConfig?.enableInteractiveButtons !== false) {
                const buttons = buttonsConfig
                  .filter((b) => b.enabled)
                  .map((b) => ({
                    type: 'reply',
                    reply: {
                      id: `${lead.id} ${b.action}`,
                      title: b.label.substring(0, 20), // WhatsApp limit
                    },
                  }));

                // Ensure at least one button if enabled, otherwise fallback to text?
                // Or just don't send buttons if all disabled? Assuming at least one enabled.
                if (buttons.length > 0) {
                  const payload: WhatsAppPayload = {
                    type: 'interactive',
                    interactive: {
                      type: 'button',
                      body: { text: alertMsg },
                      action: { buttons: buttons as any },
                    },
                  };
                  await this.sendWhatsappMessage(advisor.phone, payload);
                } else {
                  await this.sendWhatsappMessage(advisor.phone, alertMsg);
                }
              } else {
                await this.sendWhatsappMessage(
                  advisor.phone,
                  `${alertMsg}\n\nEscribe \`${lead.id} INFO\` para ver detalles.`,
                );
              }
            }
          } catch (error) {
            this.logger.error(
              `Failed to notify advisor ${advisor.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
          // --- NOTIFY ADVISOR END ---
        } else {
          this.logger.warn(
            `No advisor found to assign for lead ${session.lead_id}`,
          );
        }

        // Move to next node immediately
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            await this.executeFlowStep(updatedSession, '', from);
          }
        } else {
          await this.flowsService.completeSession(session.id);
        }
        return;
      }

      // Check if node is "IA" (IA Action) - MODIFIED: Unified check for IA Action
      const isIAAction =
        currentNode.type === 'IA Action' ||
        currentNode.data?.type === 'IA Action' ||
        currentNode.type === 'IA' ||
        currentNode.data?.type === 'IA' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('ia action:'));

      if (isIAAction) {
        this.logger.log(`Executing IA Node for lead ${session.lead_id}`);

        // 1. Fetch Conversation History
        const history = await this.getMessageHistory(from); // Last 100 messages
        // Transform to format expected by GeminiService
        const formattedHistory = history.map((msg) => ({
          role:
            msg.direction === 'outbound'
              ? ('model' as const)
              : ('user' as const),
          content: msg.body,
        }));

        // 2. Prepare Prompt from Node Label
        const lead = await this.leadsService.findById(session.lead_id);
        let prompt = (currentNode.data?.label as string) || '';

        // Remove prefix "🤖 Acción IA:" or similar
        prompt = prompt
          .replace(/^((🤖)\s*)?(IA Action|IA|Acción IA):\s*/iu, '')
          .trim();

        // Variable Substitution
        if (lead) {
          prompt = prompt.replace(/{{name}}/gi, lead.name || 'Cliente');
          prompt = prompt.replace(/{{phone}}/gi, lead.phone || '');
          prompt = prompt.replace(/{{status}}/gi, lead.status || 'SIN_ESTADO');
        }

        // Default Prompt if empty
        if (!prompt) {
          prompt = `Actúa como un Gerente de Ventas Inmobiliario. Analiza la siguiente conversación y genera un 'Briefing Ejecutivo' para el asesor humano.
            Estructura tu respuesta en estos 3 puntos clave:
            1. Perfil del Cliente: (ej. Inversionista, Familia, etc.)
            2. Termómetro de Interés: (Frio/Tibio/Caliente y por qué)
            3. Acción Sugerida: (ej. Llamar ya, Enviar brochure, etc.)`;
        }

        // 3. Generate Summary using GeminiService with Custom Prompt
        const summary = await this.geminiService.summarizeLeadConversation(
          formattedHistory,
          prompt,
        );

        // 4. Save Summary to Session Variables
        await this.flowsService.updateSessionVariables(session.id, {
          ai_summary: summary,
        });

        // 5. Persist Summary as Lead Note (Crucial for Advisor Info)
        await this.leadsService.addNote({
          leadId: session.lead_id,
          content: `RESUMEN IA INICIAL:\n${summary}`,
          type: 'SYSTEM_SUMMARY',
        });

        this.logger.log(
          `IA Summary generated, saved to session and persisted as note for lead ${session.lead_id}`,
        );

        // Move to next node immediately
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            await this.executeFlowStep(updatedSession, '', from);
          }
        } else {
          await this.flowsService.completeSession(session.id);
        }
        return;
      }

      // Check if node is "Tag" (Tagging Action)
      const isTagAction =
        currentNode.type === 'Tag' ||
        currentNode.data?.type === 'Tag' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('🏷️ etiqueta:'));

      if (isTagAction) {
        this.logger.log(`Executing Tag Node for lead ${session.lead_id}`);

        // Determine tag from node label
        const label = (currentNode.data?.label as string) || '';
        const tag = label.split('\n')[1]?.toLowerCase().trim() || 'lead frio';

        // Update lead note or specific field with tag
        await this.leadsService.addNote({
          leadId: session.lead_id,
          content: `ETIQUETA ASIGNADA: ${tag.toUpperCase()}`,
          type: 'SYSTEM_TAG',
        });

        this.logger.log(`Lead ${session.lead_id} tagged as ${tag}`);

        // Move to next node immediately
        const edge = edges.find((e) => e.source === currentNodeId);
        if (edge) {
          const nextNodeId = edge.target;
          await this.flowsService.updateSessionNode(session.id, nextNodeId);
          const updatedSession = await this.flowsService.findOneSession(
            session.id,
          );
          if (updatedSession) {
            updatedSession.flow = flow;
            await this.executeFlowStep(updatedSession, '', from);
          }
        } else {
          await this.flowsService.completeSession(session.id);
        }
        return;
      }

      const mediaUrl = currentNode.data?.mediaUrl as string | undefined;
      const mediaType = (currentNode.data?.mediaType || 'image') as
        | 'image'
        | 'document';

      if (messageToSend || mediaUrl) {
        // Check for interactive buttons in node data
        const buttons = currentNode.data?.buttons as Array<{
          id: string;
          text: string;
        }>;

        if (buttons && buttons.length > 0) {
          const payload: WhatsAppPayload = {
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: messageToSend || ' ' },
              action: {
                buttons: buttons.slice(0, 3).map((btn) => ({
                  type: 'reply',
                  reply: {
                    id: btn.id || btn.text, // Use text as ID if ID missing
                    title: btn.text.substring(0, 20), // WhatsApp limit 20 chars
                  },
                })),
              },
            },
          };

          // Add Header if media exists
          if (mediaUrl && payload.interactive) {
            payload.interactive.header = {
              type: mediaType,
              [mediaType]: { link: mediaUrl },
            };
          }

          await this.sendWhatsappMessage(from, payload);

          // AUTOMATICALLY SET brochure_enviado = true when a document is sent
          // This fixes the logic where the system forgets the brochure was sent
          if (mediaType === 'document') {
            await this.flowsService.updateSessionVariables(session.id, {
              brochure_enviado: true,
            });
            this.logger.log(
              `Marked brochure_enviado = true for session ${session.id}`,
            );
          }

          // If autoContinue is enabled, we don't stop here
          if (currentNode.data?.autoContinue) {
            this.logger.log(
              `Auto-continue enabled for node ${currentNodeId}. Proceeding...`,
            );
          } else {
            // Stop execution and wait for user interaction (button click)
            await this.flowsService.updateSessionVariables(session.id, {
              _waiting_for_input: true,
            });
            return;
          }
        } else if (mediaUrl) {
          // Media Only (with Caption)
          const payload: WhatsAppPayload = {
            type: mediaType,
            [mediaType]: {
              link: mediaUrl,
              caption: messageToSend,
            },
          };
          if (mediaType === 'document' && payload.document) {
            payload.document.filename = 'Archivo'; // Default filename
          }
          await this.sendWhatsappMessage(from, payload);
        } else {
          await this.sendWhatsappMessage(from, messageToSend);
        }
      }

      // If it's a 'Pregunta' or 'Captura' node, wait for input
      const isQuestionNode =
        currentNode.type === 'Pregunta' ||
        currentNode.data?.type === 'Pregunta' || // Check explicit type from data
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('pregunta:'));

      const isCaptureNode =
        currentNode.type === 'CapturaNombre' ||
        currentNode.data?.type === 'CapturaNombre' ||
        currentNode.type === 'CapturaEmail' ||
        currentNode.data?.type === 'CapturaEmail';

      if (isQuestionNode || isCaptureNode) {
        await this.flowsService.updateSessionVariables(session.id, {
          _waiting_for_input: true,
        });
        return; // STOP execution, wait for next message
      }
    }

    // 3. Find Next Node
    let nextNodeId: string | null = null;

    // Check if we are coming from a button click (userMessage matches a button)
    const buttons = currentNode.data?.buttons as
      | Array<{ id: string; text: string }>
      | undefined;

    if (buttons && buttons.length > 0 && userMessage) {
      // Find matching button
      const matchedButton = buttons.find(
        (b) =>
          (buttonId && b.id === buttonId) ||
          b.text.toLowerCase().trim() === userMessage.toLowerCase().trim() ||
          b.id === userMessage,
      );

      if (matchedButton) {
        // Find edge connected to this button
        // Edge sourceHandle should be `btn-${matchedButton.id}`
        const matchingEdge = edges.find(
          (e) =>
            e.source === currentNodeId &&
            e.sourceHandle === `btn-${matchedButton.id}`,
        );
        if (matchingEdge) {
          nextNodeId = matchingEdge.target;
          this.logger.log(
            `Button matched: ${matchedButton.text}. Going to node ${nextNodeId}`,
          );
        }
      }
    }

    // If no button matched or no buttons, check for default edge
    if (!nextNodeId) {
      // 1. Check for auto-continue handle
      const autoEdge = edges.find(
        (e) => e.source === currentNodeId && e.sourceHandle === 'auto',
      );

      // 2. Check for default edge (null/undefined sourceHandle)
      const defaultEdge = edges.find(
        (e) => e.source === currentNodeId && !e.sourceHandle,
      );

      if (autoEdge) {
        nextNodeId = autoEdge.target;
      } else if (defaultEdge) {
        nextNodeId = defaultEdge.target;
      }
    }

    // Fallback for backward compatibility (if no sourceHandle info exists)
    if (!nextNodeId && (!buttons || buttons.length === 0)) {
      const anyEdge = edges.find((e) => e.source === currentNodeId);
      if (anyEdge) nextNodeId = anyEdge.target;
    }

    if (nextNodeId) {
      await this.flowsService.updateSessionNode(session.id, nextNodeId);

      // Recursively execute next node immediately?
      // Yes, usually we want to chain messages unless it's a question.
      // But for safety to avoid loops, let's call it via a small delay or just return and let the user interact?
      // Better: Execute immediately to chain "Message 1" -> "Message 2" -> "Question".

      // Fetch fresh session to get updated currentNodeId
      const updatedSession = await this.flowsService.findOneSession(session.id);
      if (updatedSession) {
        // Recursive call with empty message (system transition)
        updatedSession.flow = flow; // Re-attach flow
        await this.executeFlowStep(updatedSession, '', from);
      }
    } else {
      // End of Flow
      await this.flowsService.completeSession(session.id);
      // Only send "Fin" if it wasn't a question we just asked
      if (!isWaiting) {
        // Optional: await this.sendWhatsappMessage(from, "[Fin del Flujo]");
      }
    }
  }

  @OnEvent('lead.perdido')
  async handleLeadPerdido(payload: { leadId: number; advisorId: number }) {
    this.logger.log(`Handling lead.perdido event for lead ${payload.leadId}`);
    try {
      const lead = await this.leadsService.findById(payload.leadId);
      if (!lead || !lead.phone) return;

      // Buscar si existe un flujo de nutrición
      const flows = await this.flowsService.findAll();
      const nurturingFlow = flows.find(
        (f) =>
          f.name.toLowerCase().includes('nutrición') ||
          f.name.toLowerCase().includes('perdido') ||
          f.name.toLowerCase().includes('recuperación'),
      );

      if (nurturingFlow && nurturingFlow.is_active) {
        this.logger.log(
          `Starting nurturing flow "${nurturingFlow.name}" for lead ${lead.id}`,
        );
        const nodes = nurturingFlow.nodes;
        const startNode =
          nodes.find((n) => n.type === 'input' || n.type === 'trigger') ||
          nodes[0];

        if (startNode) {
          const session = await this.flowsService.createSession(
            lead.id,
            nurturingFlow.id,
            String(startNode.id),
          );
          session.flow = nurturingFlow;
          await this.executeFlowStep(session, '', lead.phone);
        }
      } else {
        this.logger.log(`No active nurturing flow found for lead ${lead.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Error in handleLeadPerdido: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async handleAdvisorMessage(
    advisor: Advisor,
    from: string,
    body: string,
    buttonId?: string,
  ) {
    // 1. Check if advisor is in a specific state (e.g., waiting for notes)
    const stateKey = `advisor_state:${from}`;
    const stateRaw = await this.redis.get(stateKey);

    // If it's a command, we prioritize parsing it even if in a state
    const commandText = buttonId || body;
    let parsed: ParsedCommand | null = null;
    try {
      parsed = this.commandParser.parse(commandText);
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

        // Special handling for DESCARTADO reason
        const stateObj = state as any;
        if (stateObj.triggerCommand === 'DESCARTADO') {
          await this.leadsService.updateDisqualificationReason(
            state.leadId,
            body,
          );
        }

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
        const nextSteps = advConfig?.followUpInstructions
          ? advConfig.followUpInstructions.replace(
              /\{\{lead_id\}\}/g,
              String(state.leadId),
            )
          : `*Próximos pasos sugeridos:*\n- Si el lead está en proceso, envía: \`${state.leadId} SEGUIMIENTO\`\n- Si agendaste cita, envía: \`${state.leadId} CITA\`\n- Si ya hiciste recorrido, envía: \`${state.leadId} RECORRIDO\`\n- Para descartar lead, envía: \`${state.leadId} DESCARTADO\``;

        await this.sendWhatsappMessage(from, nextSteps);
        return;
      }
    }

    if (!parsed) {
      // --- AVAILABILITY LOGIC ---
      const bodyLower = body.toLowerCase().trim();
      if (bodyLower === 'disponible' || bodyLower === 'no disponible') {
        const isAvailable = bodyLower === 'disponible';
        await this.advisorsService.setAvailability(advisor.id, isAvailable);

        // Get config for messages
        const advAuto =
          await this.automationsService.getConfig('advisor_automation');
        const advConfig = advAuto?.config as AdvisorAutomationConfig;

        const responseText = isAvailable
          ? advConfig?.availabilityOnMessage ||
            '✅ Disponibilidad activada.\n\nQuedaste incluido en la asignación de leads durante las próximas 24 horas.\n\nCuando quieras salir, responde:\n"No disponible"'
          : advConfig?.availabilityOffMessage ||
            '⛔ Disponibilidad desactivada.\n\nYa no recibirás nuevos leads.\nCuando estés listo, envía:\n"Disponible"';

        await this.sendWhatsappMessage(from, responseText);
        return;
      }

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

    // 3. Handle Global Commands (PULL Mechanism)
    if (parsed.type === CommandType.SIGUIENTE) {
      // Check availability rules
      const now = new Date();
      if (
        advisor.status !== 'available' ||
        !advisor.availability_expires_at ||
        advisor.availability_expires_at < now
      ) {
        await this.sendWhatsappMessage(
          from,
          '⛔ No estás disponible para recibir leads.\n\nPor favor envía "Disponible" para activar tu ventana de asignación por 24 horas.',
        );
        return;
      }

      const lead = await this.leadsService.findOldestPendingDistributionLead();

      if (!lead) {
        await this.sendWhatsappMessage(
          from,
          '🚫 No hay leads pendientes de distribución en este momento.',
        );
        return;
      }

      // Assign Lead to Advisor
      await this.assignmentsService.createAssignment(
        lead.id,
        advisor.id,
        'PULL',
      );
      await this.leadsService.updateStatus(lead.id, LeadStatus.ASIGNADO);

      this.logger.log(
        `Lead ${lead.id} pulled by advisor ${advisor.id} (${advisor.name})`,
      );

      // Send Info/Details
      await this.handleInfo(lead.id, from);
      return;
    }

    // Ensure leadId is present for other commands
    if (!parsed.leadId) {
      await this.sendWhatsappMessage(
        from,
        '❌ Comando incompleto. Falta el ID del Lead.',
      );
      return;
    }

    // 4. Validate Ownership
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

      case CommandType.REJECT:
        this.logger.log(`Advisor ${advisor.id} rejected lead ${parsed.leadId}`);
        await this.assignmentsService.reassign(parsed.leadId, advisor.id, 1);
        await this.sendWhatsappMessage(
          from,
          `🚫 Lead #${parsed.leadId} rechazado. Buscando otro asesor...`,
        );
        break;

      case CommandType.CONTACTADO: {
        try {
          await this.eventEmitter.emitAsync('command.contactado', {
            leadId: parsed.leadId,
            advisorId: advisor.id,
          });
        } catch (error) {
          const err = error as Error;
          // Si ya está contactado, permitimos ver el menú de nuevo
          if (
            err.message.includes('Invalid transition') &&
            err.message.includes('to CONTACTADO')
          ) {
            // Continuamos
          } else {
            await this.sendWhatsappMessage(
              from,
              `❌ No se pudo actualizar el estado del lead: ${err.message}`,
            );
            return;
          }
        }

        const contactadoMsg = advConfig?.contactedPrompt
          ? advConfig.contactedPrompt.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `� *En proceso:* 
- Continuar conversando: ${parsed.leadId} SEGUIMIENTO 
- Cita agendada: ${parsed.leadId} CITA 
- Recorrido realizado: ${parsed.leadId} RECORRIDO 

🏁 *Resolución:* 
- Lead descartado: ${parsed.leadId} DESCARTADO 
- Venta cerrada: ${parsed.leadId} CIERRE 

ℹ️ *Info:* 
- Ver detalles: ${parsed.leadId} INFO

(O escribe una nota sobre este contacto)`;

        await this.sendWhatsappMessage(from, contactadoMsg);
        // Set state to wait for notes
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
            triggerCommand: 'CONTACTADO',
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

        const seguimientoMsg = advConfig?.followUpPrompt
          ? advConfig.followUpPrompt.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `🔄 Lead #${parsed.leadId} ahora está en SEGUIMIENTO. ¿Qué avances hubo hoy? Escribe una breve nota:`;

        await this.sendWhatsappMessage(from, seguimientoMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
            triggerCommand: 'SEGUIMIENTO',
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

        const citaMsg = advConfig?.appointmentPrompt
          ? advConfig.appointmentPrompt.replace(
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
            triggerCommand: 'CITA',
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.RECORRIDO: {
        this.eventEmitter.emit('command.recorrido', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const tourMsg = advConfig?.tourPrompt
          ? advConfig.tourPrompt.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `🚶 RECORRIDO registrado para el Lead #${parsed.leadId}. ¡Muy bien!\n\nPor favor, escribe una nota sobre cómo fue el recorrido:`;

        await this.sendWhatsappMessage(from, tourMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
            triggerCommand: 'RECORRIDO',
          }),
          'EX',
          1800,
        );
        break;
      }

      case CommandType.DESCARTADO: {
        this.eventEmitter.emit('command.descartado', {
          leadId: parsed.leadId,
          advisorId: advisor.id,
        });

        const descartadoMsg = advConfig?.discardedPrompt
          ? advConfig.discardedPrompt.replace(
              /\{\{lead_id\}\}/g,
              String(parsed.leadId),
            )
          : `📉 Lead #${parsed.leadId} marcado como DESCARTADO. ¿Cuál fue el motivo? (Escribe una nota)`;

        await this.sendWhatsappMessage(from, descartadoMsg);
        await this.redis.set(
          stateKey,
          JSON.stringify({
            type: 'WAITING_FOR_NOTES',
            leadId: parsed.leadId,
            timestamp: Date.now(),
            triggerCommand: 'DESCARTADO',
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

        const cierreMsg = advConfig?.closedPrompt
          ? advConfig.closedPrompt.replace(
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
            triggerCommand: 'CIERRE',
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
    buttonId?: string,
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
    if (
      body === 'START_QUALIFICATION' ||
      (buttonId && buttonId === 'START_QUALIFICATION')
    ) {
      // User clicked start, logic proceeds to AI
      // We transform the body so AI understands it naturally
      body = 'Hola, estoy listo para comenzar.';
    } else {
      // Check if we should enforce the button
      // Clean phone number for query to match normalized outbound messages
      let cleanFrom = from.replace(/\D/g, '');
      if (
        cleanFrom.startsWith('52') &&
        cleanFrom.length === 13 &&
        cleanFrom[2] === '1'
      ) {
        cleanFrom = '52' + cleanFrom.substring(3);
      }

      const lastSystemMsg = await this.messageRepository.findOne({
        where: [
          { to: from, direction: MessageDirection.OUTBOUND },
          { to: cleanFrom, direction: MessageDirection.OUTBOUND },
        ],
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
        'un asesor se pondrá en contacto',
        'hemos recibido tus datos',
        'proceso de precalificación ha terminado',
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
          this.logger.log(
            `Lead ${from} assigned to advisor ${advisor.name} (${advisor.phone})`,
          );

          // Get Advisor Automation Config
          const advAuto =
            await this.automationsService.getConfig('advisor_automation');
          const advConfig = advAuto?.config as AdvisorAutomationConfig;
          this.logger.debug(`Advisor automation config found: ${!!advConfig}`);

          // Generate Summary and Save Note for Assignment Notification (Before Assignment)
          const historyRaw = await this.redis.get(historyKey);
          this.logger.debug(`History raw found: ${!!historyRaw}`);

          if (historyRaw) {
            const history = JSON.parse(historyRaw) as Array<{
              role: 'user' | 'model';
              content: string;
            }>;

            let summary = 'No hay historial.';
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

            await this.leadsService.addNote({
              leadId: lead.id,
              advisorId: advisor.id,
              content: `RESUMEN IA INICIAL:\n${summary}`,
              type: 'SYSTEM_SUMMARY',
            });
          }

          // Emit event to start SLA and other pipeline logic (Triggers Assignment Creation & Notification)
          this.eventEmitter.emit('pipeline.assign', {
            leadId: lead.id,
            advisorId: advisor.id,
            source: 'SYSTEM',
          });

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

    // Update Status to ASESOR_INFORMADO if applicable
    if (lead.status === LeadStatus.ASIGNADO) {
      await this.leadsService.updateStatus(leadId, LeadStatus.ASESOR_INFORMADO);
    }

    // Get Notes (Summary)
    const notes = await this.leadsService.getNotes(leadId);
    const summaryNote = notes.find((n) => n.type === 'SYSTEM_SUMMARY');
    let summary = 'Sin resumen previo.';

    if (summaryNote) {
      summary = summaryNote.content.replace('RESUMEN IA INICIAL:\n', '');
    } else {
      // Fallback to Redis history if needed
      const historyKey = `bot_history:${lead.phone}`;
      const historyRaw = await this.redis.get(historyKey);
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
    }

    // Format Phone for Link (Remove '1' after '52')
    const phoneLink = this.formatPhoneForLink(lead.phone);
    const chatLink = `https://wa.me/${phoneLink}`;

    // Get Config for limit
    const advAuto =
      await this.automationsService.getConfig('advisor_automation');
    const advConfig = advAuto?.config as AdvisorAutomationConfig;
    const responseLimit = advConfig?.responseTimeLimitMinutes || 15;

    // MENSAJE 2: DETALLES DEL LEAD (TEXTO PLANO PARA EVITAR LIMITE DE 1024 CARACTERES)
    const detailMsg = `Esta es el detalle de tu lead asignado:
    
👤 *Prospecto:* ${lead.name}
📱 *Teléfono:* ${phoneLink}

👉 *Comienza el contacto:* ${chatLink}

*RESUMEN DE PRECALIFICACIÓN:*
${summary}`;

    // MENSAJE 3: ACCIÓN DE CONTACTO (Fase 2)
    // 1. Determinar Origen
    const assignment =
      await this.assignmentsService.findActiveAssignment(leadId);
    const source = assignment?.source || 'SYSTEM';

    // 2. Configuración por defecto (Fallback)
    let actionMsg = `⚠️ *URGENCIA:* El lead debe de ser contactado desde el momento que se te asignó en menos de ${responseLimit} min. o será reasignado.\n\n✅ Presiona el botón de contactado después de tu primer mensaje con el lead.`;
    let actionButtons = [
      { action: 'CONTACTED', label: '✅ LEAD CONTACTADO', enabled: true },
    ];

    // 3. Cargar configuración específica según origen
    let targetConfig: MessageConfig | undefined;
    if (source === 'MANUAL') targetConfig = advConfig?.manualAssignmentAction;
    else if (source === 'REASSIGNMENT')
      targetConfig = advConfig?.reassignmentAction;
    else targetConfig = advConfig?.systemAssignmentAction; // SYSTEM default

    if (targetConfig) {
      actionMsg = targetConfig.message
        .replace(/\{\{lead_name\}\}/g, lead.name)
        .replace(/\{\{response_limit\}\}/g, String(responseLimit));

      if (targetConfig.buttons && targetConfig.buttons.length > 0) {
        actionButtons = targetConfig.buttons.filter((b) => b.enabled);
      }
    }

    // Enviar detalles primero como texto plano
    await this.sendWhatsappMessage(from, detailMsg);

    if (advConfig?.enableInteractiveButtons !== false) {
      const whatsappButtons = actionButtons.map((btn) => ({
        type: 'reply',
        reply: {
          id: `${lead.id} ${btn.action}`, // Ej: "123 CONTACTED"
          title: btn.label.substring(0, 20), // WhatsApp limit 20 chars
        },
      }));

      // WhatsApp permite max 3 botones
      const validButtons = whatsappButtons.slice(0, 3);

      if (validButtons.length > 0) {
        const payload: WhatsAppPayload = {
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: actionMsg },
            action: {
              buttons: validButtons,
            },
          },
        };
        await this.sendWhatsappMessage(from, payload);
      } else {
        // Fallback si no hay botones válidos habilitados
        await this.sendWhatsappMessage(from, actionMsg);
      }
    } else {
      await this.sendWhatsappMessage(
        from,
        `${actionMsg}\n\nEscribe \`${lead.id} CONTACTADO\` para confirmar.`,
      );
    }
  }

  private formatPhoneForLink(phone: string): string {
    // Remove all non-digits
    const clean = phone.replace(/\D/g, '');
    // If Mexico (52) and has 13 digits starting with 521, remove the 1
    if (clean.startsWith('52') && clean.length === 13 && clean[2] === '1') {
      return '52' + clean.substring(3);
    }
    return clean;
  }

  async sendWelcomeMessage(to: string, leadName?: string) {
    const automation = await this.automationsService.getConfig();
    const config =
      automation?.name === 'lead_qualification'
        ? (automation.config as LeadQualificationConfig)
        : null;

    let welcomeText =
      config?.welcomeMessage ||
      'Hola 👋\nSoy el asistente automático de Dreambuilt OS.\n\nPara dirigir tu solicitud correctamente y evitar demoras, necesito hacerte 3 preguntas rápidas.\n\n👉 Presiona “Comenzar” para continuar.';
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
  ): Promise<any> {
    const accessToken = this.configService.get<string>('whatsapp.accessToken');
    const phoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    );
    const apiVersion =
      this.configService.get<string>('whatsapp.apiVersion') || 'v21.0';

    if (!accessToken || !phoneNumberId) {
      this.logger.error('WhatsApp credentials missing');
      return;
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // Clean phone number: remove any + or spaces (just in case)
    let cleanTo = to.replace(/\D/g, '');

    // Mexico Special Case: WhatsApp Cloud API requires '52' followed by the 10 digits
    // for messages to be delivered correctly to Mexican numbers.
    // The '1' prefix (521...) is often deprecated or causes issues in the Cloud API.
    if (
      cleanTo.startsWith('52') &&
      cleanTo.length === 13 &&
      cleanTo[2] === '1'
    ) {
      cleanTo = '52' + cleanTo.substring(3);
      this.logger.debug(
        `Normalized Mexico number (removed 1): ${to} -> ${cleanTo}`,
      );
    } else if (
      cleanTo.startsWith('52') &&
      cleanTo.length === 12 &&
      cleanTo[2] !== '1'
    ) {
      // Already correct 52 + 10 digits
      this.logger.debug(`Mexico number already correct: ${cleanTo}`);
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
    } else if (content.type === 'image') {
      payload.type = 'image';
      payload.image = content.image;
    } else if (content.type === 'document') {
      payload.type = 'document';
      payload.document = content.document;
    } else {
      // Fallback/Generic object merge
      Object.assign(payload, content);
    }

    try {
      this.logger.log(`WhatsApp API Request: ${JSON.stringify(payload)}`);
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`WhatsApp API Success: ${JSON.stringify(response.data)}`);
      const waId = (response.data as { messages: Array<{ id: string }> })
        .messages[0].id;
      this.logger.log(`WhatsApp message sent to ${cleanTo}. SID: ${waId}`);

      // Find lead to associate message
      let lead: Lead | null = null;
      try {
        let foundLead = await this.leadsService.findByPhone(cleanTo);

        // If not found and cleaned number is different from original, try original
        if (!foundLead && cleanTo !== to) {
          this.logger.debug(
            `Lead not found with ${cleanTo}, trying original ${to}`,
          );
          foundLead = await this.leadsService.findByPhone(to);
        }

        // Specific check for Mexico numbers (52 vs 521)
        if (!foundLead && cleanTo.startsWith('52') && cleanTo.length === 12) {
          // Try adding '1' after '52'
          const mexicoAlt = '521' + cleanTo.substring(2);
          this.logger.debug(`Trying Mexico alternative: ${mexicoAlt}`);
          foundLead = await this.leadsService.findByPhone(mexicoAlt);
        } else if (
          !foundLead &&
          cleanTo.startsWith('521') &&
          cleanTo.length === 13
        ) {
          // Try removing '1' after '52'
          const mexicoAlt = '52' + cleanTo.substring(3);
          this.logger.debug(`Trying Mexico alternative: ${mexicoAlt}`);
          foundLead = await this.leadsService.findByPhone(mexicoAlt);
        }

        if (foundLead) {
          lead = foundLead;
        }
      } catch {
        this.logger.warn(
          `Could not find lead for phone ${cleanTo} to associate message`,
        );
      }

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
        lead: lead || undefined,
      });
      await this.messageRepository.save(msg);
      return response.data as Record<string, unknown>;
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
    this.logger.log(`Sending outbound message to ${to}: ${body}`);
    // 1. Send via WhatsApp API
    try {
      await this.sendWhatsappMessage(to, body);
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to send WhatsApp message to ${to}: ${err.message}`,
      );
      throw error;
    }

    // 2. Persist message
    // Note: sendWhatsappMessage already persists the message, we don't need to do it twice.
    // However, if we want to be sure it shows up in history even if Meta fails (optional),
    // but the current implementation of sendWhatsappMessage handles it correctly.

    // We'll remove this redundant persistence to avoid duplicates
    /*
    const msg = this.messageRepository.create({
      from: 'SYSTEM', // Represents the advisor/bot
      to: to,
      body: body,
      direction: MessageDirection.OUTBOUND,
      waId: `out_${Date.now()}`,
    });
    await this.messageRepository.save(msg);
    */

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

    return { status: 'sent' };
  }

  async getLatestChats() {
    // Determine the conversation partner (phone number)
    // If direction is INBOUND, partner is 'from'
    // If direction is OUTBOUND, partner is 'to'

    // We want the LATEST message for each partner.

    // Logic to determine partner phone for fallback
    const rawPartnerPhoneSql = `CASE 
          WHEN m_sub.from = 'SYSTEM' THEN m_sub.to
          WHEN m_sub.to = 'SYSTEM' THEN m_sub.from
          ELSE (CASE WHEN m_sub.direction = 'outbound' THEN m_sub.to ELSE m_sub.from END)
        END`;

    // Normalize Mexico phones: 521... -> 52...
    const partnerPhoneSql = `CASE 
          WHEN (${rawPartnerPhoneSql}) LIKE '521%' AND LENGTH(${rawPartnerPhoneSql}) = 13 
          THEN '52' || SUBSTRING(${rawPartnerPhoneSql}, 4)
          ELSE ${rawPartnerPhoneSql}
        END`;

    // Step 1: Get the latest message ID/Timestamp for each conversation
    // Grouping by Lead ID (if available) takes precedence over Phone
    const subQuery = this.messageRepository
      .createQueryBuilder('m_sub')
      .select('MAX(m_sub.created_at)', 'max_ts')
      .addSelect(
        `COALESCE(CAST(m_sub.lead_id AS VARCHAR), ${partnerPhoneSql})`,
        'conversation_key',
      )
      .groupBy('conversation_key');

    // Logic to determine partner phone for the main query
    const rawMessagePartnerPhoneSql = `CASE 
          WHEN message.from = 'SYSTEM' THEN message.to
          WHEN message.to = 'SYSTEM' THEN message.from
          ELSE (CASE WHEN message.direction = 'outbound' THEN message.to ELSE message.from END)
        END`;

    const messagePartnerPhoneSql = `CASE 
          WHEN (${rawMessagePartnerPhoneSql}) LIKE '521%' AND LENGTH(${rawMessagePartnerPhoneSql}) = 13 
          THEN '52' || SUBSTRING(${rawMessagePartnerPhoneSql}, 4)
          ELSE ${rawMessagePartnerPhoneSql}
        END`;

    // Step 2: Join back to get message details
    return (
      this.messageRepository
        .createQueryBuilder('message')
        .innerJoin(
          `(${subQuery.getQuery()})`,
          'latest',
          `message.created_at = latest.max_ts AND 
           COALESCE(CAST(message.lead_id AS VARCHAR), ${messagePartnerPhoneSql}) = latest.conversation_key`,
        )
        // Join leads. We try to match by ID first (more reliable), then by phone.
        .leftJoin(
          'leads',
          'leads',
          `leads.id = message.lead_id OR leads.phone = ${messagePartnerPhoneSql}`,
        )
        // Join advisors to identify internal chats
        .leftJoin(
          'advisors',
          'advisors',
          `advisors.phone = ${messagePartnerPhoneSql}`,
        )
        .select(`COALESCE(leads.phone, ${messagePartnerPhoneSql})`, 'contact')
        .addSelect(
          `COALESCE(advisors.name, leads.name, leads.phone, ${messagePartnerPhoneSql})`,
          'name',
        )
        .addSelect('message.body', 'lastMessage')
        .addSelect('message.created_at', 'timestamp')
        .addSelect('leads.avatar_url', 'avatar')
        .addSelect('message.direction', 'direction')
        .addSelect('leads.id', 'leadId')
        .addSelect(
          'CASE WHEN advisors.id IS NOT NULL THEN true ELSE false END',
          'is_advisor',
        )
        .orderBy('message.created_at', 'DESC')
        .getRawMany()
    );
  }

  async getMessageHistory(phone: string) {
    // Try to find a lead first to get all messages associated with the lead
    // Use the same robust search as in sendOutboundMessage
    let lead = await this.leadsService.findByPhone(phone);

    const altPhones = [phone];
    if (phone.startsWith('52') && phone.length === 12) {
      const alt = '521' + phone.substring(2);
      altPhones.push(alt);
      if (!lead) lead = await this.leadsService.findByPhone(alt);
    } else if (phone.startsWith('521') && phone.length === 13) {
      const alt = '52' + phone.substring(3);
      altPhones.push(alt);
      if (!lead) lead = await this.leadsService.findByPhone(alt);
    }

    if (lead) {
      return this.messageRepository.find({
        where: [
          { leadId: lead.id }, // Primary check: messages linked to this lead
          // Fallback: unlinked messages from/to this phone OR its alternative
          ...altPhones.map((p) => ({ from: p })),
          ...altPhones.map((p) => ({ to: p })),
        ],
        order: { createdAt: 'ASC' },
        take: 100,
      });
    }

    // If no lead found, just search by phones
    return this.messageRepository.find({
      where: [
        ...altPhones.map((p) => ({ from: p })),
        ...altPhones.map((p) => ({ to: p })),
      ],
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

    return `Eres Dreambuilt, un asistente virtual de ventas. Tu estilo de comunicación es ${toneStyle}.
${
  leadName && leadName !== 'Prospecto WhatsApp'
    ? `\nEstás hablando con ${leadName}. Dirígete a esta persona por su nombre de manera natural (no en cada frase, pero sí al inicio o al despedirte).`
    : config.askForName
      ? '\nNo sabes el nombre del prospecto. TU PRIORIDAD ES PREGUNTAR SU NOMBRE antes de comenzar con la calificación. Hazlo de manera amable y natural, por ejemplo: "¡Hola! Soy el asistente virtual de Dreambuilt OS. Para dirigirme a ti correctamente, ¿cuál es tu nombre?".'
      : '\nNo sabes el nombre del prospecto. Puedes preguntárselo si surge naturalmente, pero NO es obligatorio ni prioritario.'
}

${config.businessContext ? `CONTEXTO DE LA EMPRESA:\n${config.businessContext}\n` : ''}
${productsSection}

OBJETIVO:
Debes guiar la conversación para obtener las siguientes respuestas del prospecto una por una.
DEBES UTILIZAR LAS SIGUIENTES PREGUNTAS EXACTAMENTE O MUY SIMILARES, SIN INVENTAR TEMAS NUEVOS:
${config.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

REGLAS CRÍTICAS:
1. Haz SOLO UNA PREGUNTA a la vez de la lista anterior. Espera la respuesta.
2. NO realices preguntas que no estén en la lista de arriba, excepto para aclarar una respuesta del prospecto si es ambigua.
3. Si el usuario responde con información relevante, avanza a la siguiente pregunta de la lista.
4. Si el prospecto intenta desviar la conversación, redirígelo amablemente para completar el cuestionario.
5. CUANDO HAYAS OBTENIDO TODAS LAS RESPUESTAS (verifica que tengas respuesta para cada una), DEBES finalizar tu mensaje con la etiqueta exacta "[COMPLETED]".
6. Usa el mensaje de cierre configurado para despedirte.

Ejemplo de respuesta final:
"${config.completionMessage} [COMPLETED]"
${resourcesSection}`;
  }
}
