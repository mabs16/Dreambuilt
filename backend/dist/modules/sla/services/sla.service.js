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
var SlaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const sla_job_entity_1 = require("../entities/sla-job.entity");
let SlaService = SlaService_1 = class SlaService {
    slaRepository;
    slaQueue;
    logger = new common_1.Logger(SlaService_1.name);
    constructor(slaRepository, slaQueue) {
        this.slaRepository = slaRepository;
        this.slaQueue = slaQueue;
    }
    async createSla(leadId, advisorId, reassignmentCount = 0) {
        const dueAt = new Date(Date.now() + 15 * 60 * 1000);
        const slaJob = this.slaRepository.create({
            lead_id: leadId,
            advisor_id: advisorId,
            due_at: dueAt,
            reassignment_count: reassignmentCount,
            status: sla_job_entity_1.SlaStatus.PENDING,
        });
        const savedJob = await this.slaRepository.save(slaJob);
        await this.slaQueue.add('check-sla', { slaJobId: savedJob.id, leadId, advisorId }, { delay: 15 * 60 * 1000, jobId: `sla-${savedJob.id}` });
        this.logger.log(`SLA created for lead ${leadId} assigned to advisor ${advisorId}`);
        return savedJob;
    }
    async completeSla(leadId) {
        const pendingJob = await this.slaRepository.findOne({
            where: { lead_id: leadId, status: sla_job_entity_1.SlaStatus.PENDING },
        });
        if (pendingJob) {
            pendingJob.status = sla_job_entity_1.SlaStatus.COMPLETED;
            await this.slaRepository.save(pendingJob);
            const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
            if (job)
                await job.remove();
            this.logger.log(`SLA completed for lead ${leadId}`);
        }
    }
    async cancelSla(leadId) {
        const pendingJob = await this.slaRepository.findOne({
            where: { lead_id: leadId, status: sla_job_entity_1.SlaStatus.PENDING },
        });
        if (pendingJob) {
            pendingJob.status = sla_job_entity_1.SlaStatus.COMPLETED;
            await this.slaRepository.save(pendingJob);
            const job = await this.slaQueue.getJob(`sla-${pendingJob.id}`);
            if (job)
                await job.remove();
        }
    }
};
exports.SlaService = SlaService;
exports.SlaService = SlaService = SlaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sla_job_entity_1.SlaJob)),
    __param(1, (0, bullmq_1.InjectQueue)('sla-queue')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        bullmq_2.Queue])
], SlaService);
//# sourceMappingURL=sla.service.js.map