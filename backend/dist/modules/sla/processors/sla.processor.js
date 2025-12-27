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
var SlaProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sla_job_entity_1 = require("../entities/sla-job.entity");
const leads_service_1 = require("../../leads/leads.service");
const assignments_service_1 = require("../../assignments/assignments.service");
const scores_service_1 = require("../../scores/scores.service");
const lead_entity_1 = require("../../leads/entities/lead.entity");
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const whatsapp_service_1 = require("../../whatsapp/services/whatsapp.service");
const advisors_service_1 = require("../../advisors/advisors.service");
const automations_service_1 = require("../../whatsapp/services/automations.service");
let SlaProcessor = SlaProcessor_1 = class SlaProcessor extends bullmq_1.WorkerHost {
    slaRepository;
    leadsService;
    assignmentsService;
    scoresService;
    eventEmitter;
    whatsappService;
    advisorsService;
    automationsService;
    logger = new common_1.Logger(SlaProcessor_1.name);
    constructor(slaRepository, leadsService, assignmentsService, scoresService, eventEmitter, whatsappService, advisorsService, automationsService) {
        super();
        this.slaRepository = slaRepository;
        this.leadsService = leadsService;
        this.assignmentsService = assignmentsService;
        this.scoresService = scoresService;
        this.eventEmitter = eventEmitter;
        this.whatsappService = whatsappService;
        this.advisorsService = advisorsService;
        this.automationsService = automationsService;
    }
    async process(job) {
        if (job.name === 'check-sla') {
            const { slaJobId, leadId, advisorId } = job.data;
            const slaJob = await this.slaRepository.findOne({
                where: { id: slaJobId },
            });
            if (!slaJob || slaJob.status !== sla_job_entity_1.SlaStatus.PENDING)
                return;
            const lead = await this.leadsService.findById(leadId);
            if (lead.status === lead_entity_1.LeadStatus.ASIGNADO) {
                this.logger.warn(`SLA Failed for lead ${leadId} (Advisor ${advisorId})`);
                slaJob.status = sla_job_entity_1.SlaStatus.FAILED;
                await this.slaRepository.save(slaJob);
                const automation = await this.automationsService.getConfig('advisor_automation');
                const advisorConfig = automation?.config;
                let message = `⚠️ *ALERTA DE SLA*: Han pasado 15 minutos sin contacto con el Lead #${leadId} (${lead.name}).\n\nEl lead será reasignado y tu puntuación ha sido penalizada. 📉`;
                if (advisorConfig?.slaWarningMessage) {
                    message = advisorConfig.slaWarningMessage
                        .replace(/\{\{lead_id\}\}/g, String(leadId))
                        .replace(/\{\{lead_name\}\}/g, lead.name);
                }
                const advisor = await this.advisorsService.findById(advisorId);
                if (advisor) {
                    await this.whatsappService.sendWhatsappMessage(advisor.phone, message);
                }
                const hasAttempts = (await this.eventEmitter.emitAsync('event.validate_attempts', { leadId, advisorId }));
                const penalty = hasAttempts && hasAttempts[0] ? -2 : -5;
                await this.scoresService.addScore(advisorId, leadId, penalty, 'SLA_FAILED');
                if (slaJob.reassignment_count < 2) {
                    await this.assignmentsService.reassign(leadId, advisorId, slaJob.reassignment_count + 1);
                }
                else {
                    await this.leadsService.freezeForManualReview();
                }
                this.eventEmitter.emit('event.created', {
                    leadId,
                    advisorId,
                    type: 'SLA_FAILED',
                    payload: {
                        reason: 'NO_ATENDIDO',
                        attempt_count: hasAttempts && hasAttempts[0] ? 1 : 0,
                    },
                });
            }
        }
    }
};
exports.SlaProcessor = SlaProcessor;
exports.SlaProcessor = SlaProcessor = SlaProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('sla-queue'),
    __param(0, (0, typeorm_1.InjectRepository)(sla_job_entity_1.SlaJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        leads_service_1.LeadsService,
        assignments_service_1.AssignmentsService,
        scores_service_1.ScoresService,
        event_emitter_1.EventEmitter2,
        whatsapp_service_1.WhatsappService,
        advisors_service_1.AdvisorsService,
        automations_service_1.AutomationsService])
], SlaProcessor);
//# sourceMappingURL=sla.processor.js.map