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
var PipelineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const leads_service_1 = require("../leads.service");
const lead_state_machine_service_1 = require("./lead-state-machine.service");
const lead_entity_1 = require("../entities/lead.entity");
const event_emitter_2 = require("@nestjs/event-emitter");
const scores_service_1 = require("../../scores/scores.service");
const sla_service_1 = require("../../sla/services/sla.service");
let PipelineService = PipelineService_1 = class PipelineService {
    leadsService;
    stateMachine;
    eventEmitter;
    scoresService;
    slaService;
    logger = new common_1.Logger(PipelineService_1.name);
    constructor(leadsService, stateMachine, eventEmitter, scoresService, slaService) {
        this.leadsService = leadsService;
        this.stateMachine = stateMachine;
        this.eventEmitter = eventEmitter;
        this.scoresService = scoresService;
        this.slaService = slaService;
    }
    async handleContactado(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.CONTACTADO);
        await this.slaService.completeSla(payload.leadId);
        const status = await this.eventEmitter.emitAsync('sla.check_status', payload.leadId);
        const points = (status && status[0] === 'FAILED') ? 1 : 2;
        await this.scoresService.addScore(payload.advisorId, payload.leadId, points, 'CONTACTADO');
    }
    async handleCita(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.CITA);
        await this.scoresService.addScore(payload.advisorId, payload.leadId, 5, 'CITA');
    }
    async handleCierre(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.CIERRE);
        await this.scoresService.addScore(payload.advisorId, payload.leadId, 10, 'CIERRE');
    }
    async handleSeguimiento(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.SEGUIMIENTO);
    }
    async handlePerdido(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.PERDIDO);
    }
    async handleIntento(payload) {
        this.eventEmitter.emit('event.created', {
            leadId: payload.leadId,
            advisorId: payload.advisorId,
            type: 'INTENTO_CONTACTO',
        });
    }
    async handleAssign(payload) {
        await this.transitionLead(payload.leadId, payload.advisorId, lead_entity_1.LeadStatus.ASIGNADO);
        await this.slaService.createSla(payload.leadId, payload.advisorId);
    }
    async transitionLead(leadId, advisorId, nextStatus) {
        const lead = await this.leadsService.findById(leadId);
        try {
            this.stateMachine.validateTransition(lead.status, nextStatus);
            await this.leadsService.updateStatus(leadId, nextStatus);
            this.eventEmitter.emit('event.created', {
                leadId,
                advisorId,
                type: 'STATUS_CHANGE',
                payload: { from: lead.status, to: nextStatus },
            });
        }
        catch (error) {
            this.logger.error(`Failed transition for lead ${leadId}: ${error.message}`);
            throw error;
        }
    }
};
exports.PipelineService = PipelineService;
__decorate([
    (0, event_emitter_1.OnEvent)('command.contactado'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleContactado", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.cita'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleCita", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.cierre'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleCierre", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.seguimiento'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleSeguimiento", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.perdido'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handlePerdido", null);
__decorate([
    (0, event_emitter_1.OnEvent)('command.intento_contacto'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleIntento", null);
__decorate([
    (0, event_emitter_1.OnEvent)('pipeline.assign'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineService.prototype, "handleAssign", null);
exports.PipelineService = PipelineService = PipelineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [leads_service_1.LeadsService,
        lead_state_machine_service_1.LeadStateMachine,
        event_emitter_2.EventEmitter2,
        scores_service_1.ScoresService,
        sla_service_1.SlaService])
], PipelineService);
//# sourceMappingURL=pipeline.service.js.map