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
import { LeadStatus, Lead } from '../../leads/entities/lead.entity';
import { FlowsService } from '../../flows/flows.service';
import { FlowSession } from '../../flows/entities/flow-session.entity';
import {
  LeadQualificationConfig,
  AdvisorAutomationConfig,
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
    const message = `¡Hola ${payload.name}! Tu código de verificación para Dreambuilt OS es: ${payload.pin}. Expira en 5 minutos.`;
    await this.sendWhatsappMessage(payload.phone, message);
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
        return await this.handleAdvisorMessage(advisor, from, body);
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

    // 1. Process User Input (if we are waiting for an answer)
    const isWaiting = session.variables?._waiting_for_input === true;

    if (isWaiting) {
      // User just answered the question of 'currentNode'
      if (currentNode.data && currentNode.data.variable) {
        const varName = currentNode.data.variable;
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
      // We just arrived at this node. Execute its action.
      let messageToSend = currentNode.data?.label || '';

      // Robust cleaning of node labels
      // 1. Remove prefixes including emojis if present
      messageToSend = messageToSend
        .replace(
          /^((💬|❓|⚡|🤖|🏷️)\s*)?(Mensaje|Pregunta|IA Action|IA|Etiqueta|Condición|Tag):\s*/iu,
          '',
        )
        .trim();

      // 2. Variable Substitution (e.g., {{name}})
      const lead = await this.leadsService.findById(session.lead_id);
      if (lead) {
        messageToSend = messageToSend.replace(
          /{{name}}/gi,
          lead.name || 'Cliente',
        );
        messageToSend = messageToSend.replace(/{{phone}}/gi, lead.phone || '');
        // Add more variables here if needed
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
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('ia action:'))
      ) {
        this.logger.log(`Executing IA Action for lead ${session.lead_id}`);
        // TODO: Integrate with AI Service (OpenAI/Gemini) here
        // For now, we just pass through to the next node

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

      // Check if node is "Etiqueta" (Label)
      // Logic: Tag the lead, do NOT send message to WhatsApp
      if (
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
          // TODO: Implement actual tagging logic in LeadsService
          // await this.leadsService.addTag(session.lead_id, tag);
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
        const targetStatus = label.toLowerCase().includes('asignado')
          ? LeadStatus.ASIGNADO
          : LeadStatus.PRECALIFICADO;

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
        let advisor: Advisor | null = null;

        if (label.toLowerCase().includes('manual')) {
          // Extract advisor name or ID from label "👤 Asignación:\nManual: Nombre (ID: 123)" or "Manual: Nombre"

          // 1. Try to extract ID directly (more robust)
          const idMatch = label.match(/\(ID:\s*(\d+)\)/);
          if (idMatch && idMatch[1]) {
            const advisorId = parseInt(idMatch[1], 10);
            advisor = await this.advisorsService.findById(advisorId);
            this.logger.log(
              `Manual assignment by ID: ${advisorId} -> Found: ${advisor ? advisor.name : 'No'}`,
            );
          }

          // 2. Fallback to name search if ID not found or advisor lookup failed
          if (!advisor) {
            const parts = label.split('Manual:');
            if (parts.length > 1) {
              // Remove (ID: ...) part if present to clean the name
              const advisorName = parts[1].replace(/\(ID:\s*\d+\)/, '').trim();

              this.logger.log(
                `Manual assignment searching by name: '${advisorName}'`,
              );

              const allAdvisors = await this.advisorsService.findAll();
              advisor =
                allAdvisors.find(
                  (a) => a.name.toLowerCase() === advisorName.toLowerCase(),
                ) || null;

              if (!advisor) {
                // Try partial match or more lenient search
                const targetName = advisorName.toLowerCase();
                advisor =
                  allAdvisors.find((a) => {
                    const aName = a.name.toLowerCase();
                    return (
                      aName.includes(targetName) || targetName.includes(aName)
                    );
                  }) || null;
                if (advisor) {
                  this.logger.warn(
                    `Advisor found via fuzzy match: '${advisorName}' -> '${advisor.name}'`,
                  );
                }
              }
            }
          }
        } else {
          // Default: Round Robin
          advisor = await this.advisorsService.findFirstAvailable();
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

          // Save Summary as Note (Persistencia solicitada)
          await this.leadsService.addNote({
            leadId: session.lead_id,
            advisorId: advisor.id,
            content: `RESUMEN IA INICIAL:\n${aiSummary}`,
            type: 'SYSTEM_SUMMARY',
          });

          // --- NOTIFY ADVISOR START ---
          try {
            const lead = await this.leadsService.findById(session.lead_id);
            if (lead && advisor.phone) {
              // Get Advisor Automation Config
              const advAuto =
                await this.automationsService.getConfig('advisor_automation');
              const advConfig = advAuto?.config as AdvisorAutomationConfig;

              const responseLimit = advConfig?.responseTimeLimitMinutes || 15;
              
              // MENSAJE 1: ALERTA INICIAL
              const alertMsg = `🔔 *NUEVO LEAD ASIGNADO*\n\nℹ️ Presiona el botón de ver info para obtener detalles.\n\n⚠️ *URGENCIA:* Debes responder en menos de ${responseLimit} min. o será reasignado.`;

              this.logger.debug(
                `Sending message to advisor ${advisor.phone}...`,
              );
              if (advConfig?.enableInteractiveButtons !== false) {
                const payload: WhatsAppPayload = {
                  type: 'interactive',
                  interactive: {
                    type: 'button',
                    body: { text: alertMsg },
                    action: {
                      buttons: [
                        {
                          type: 'reply',
                          reply: {
                            id: `${lead.id} INFO`,
                            title: 'ℹ️ VER INFO LEAD',
                          },
                        },
                      ],
                    },
                  },
                };
                await this.sendWhatsappMessage(advisor.phone, payload);
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

      // Check if node is "IA" (IA Action)
      if (
        currentNode.type === 'IA' ||
        currentNode.data?.type === 'IA' ||
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('ia action:'))
      ) {
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
        this.logger.log(
          `IA Summary generated and saved for lead ${session.lead_id}`,
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

          // Stop execution and wait for user interaction (button click)
          await this.flowsService.updateSessionVariables(session.id, {
            _waiting_for_input: true,
          });
          return;
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

      // If it's a 'Pregunta' node, wait for input
      if (
        currentNode.type === 'Pregunta' ||
        currentNode.data?.type === 'Pregunta' || // Check explicit type from data
        (currentNode.data?.label &&
          currentNode.data.label.toLowerCase().includes('pregunta:'))
      ) {
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
      // Default edge usually has sourceHandle null or undefined
      const defaultEdge = edges.find(
        (e) => e.source === currentNodeId && !e.sourceHandle,
      );
      if (defaultEdge) {
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
          const history = JSON.parse(historyRaw) as Array<{role: string, content: string}>;
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
    const advAuto = await this.automationsService.getConfig('advisor_automation');
    const advConfig = advAuto?.config as AdvisorAutomationConfig;
    const responseLimit = advConfig?.responseTimeLimitMinutes || 15;

    // MENSAJE 2: DETALLES DEL LEAD
    const msg = `Esta es el detalle de tu lead asignado:
    
👤 *Prospecto:* ${lead.name}
📱 *Teléfono:* ${phoneLink}

👉 *Comienza el contacto:* ${chatLink}

*RESUMEN DE PRECALIFICACIÓN:*
${summary}

⚠️ *URGENCIA:* El lead debe de ser contactado desde el momento que se te asignó en menos de ${responseLimit} min. o será reasignado.

✅ Presiona el botón de contactado después de tu primer mensaje con el lead.`;

    if (advConfig?.enableInteractiveButtons !== false) {
      const payload: WhatsAppPayload = {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: msg },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `${lead.id} CONTACTADO`,
                  title: '✅ LEAD CONTACTADO',
                },
              },
            ],
          },
        },
      };
      await this.sendWhatsappMessage(from, payload);
    } else {
      await this.sendWhatsappMessage(
        from,
        `${msg}\n\nEscribe \`${lead.id} CONTACTADO\` para confirmar.`,
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
    const partnerPhoneSql = `CASE 
          WHEN m_sub.from = 'SYSTEM' THEN m_sub.to
          WHEN m_sub.to = 'SYSTEM' THEN m_sub.from
          ELSE (CASE WHEN m_sub.direction = 'outbound' THEN m_sub.to ELSE m_sub.from END)
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
    const messagePartnerPhoneSql = `CASE 
          WHEN message.from = 'SYSTEM' THEN message.to
          WHEN message.to = 'SYSTEM' THEN message.from
          ELSE (CASE WHEN message.direction = 'outbound' THEN message.to ELSE message.from END)
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
        .select(`COALESCE(leads.phone, ${messagePartnerPhoneSql})`, 'contact')
        .addSelect(
          `COALESCE(leads.name, leads.phone, ${messagePartnerPhoneSql})`,
          'name',
        )
        .addSelect('message.body', 'lastMessage')
        .addSelect('message.created_at', 'timestamp')
        .addSelect('leads.avatar_url', 'avatar')
        .addSelect('message.direction', 'direction')
        .addSelect('leads.id', 'leadId')
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
