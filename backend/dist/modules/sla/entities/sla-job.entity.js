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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaJob = exports.SlaStatus = void 0;
const typeorm_1 = require("typeorm");
const lead_entity_1 = require("../../leads/entities/lead.entity");
const advisor_entity_1 = require("../../advisors/entities/advisor.entity");
var SlaStatus;
(function (SlaStatus) {
    SlaStatus["PENDING"] = "PENDING";
    SlaStatus["COMPLETED"] = "COMPLETED";
    SlaStatus["FAILED"] = "FAILED";
})(SlaStatus || (exports.SlaStatus = SlaStatus = {}));
let SlaJob = class SlaJob {
    id;
    lead_id;
    advisor_id;
    lead;
    advisor;
    type;
    due_at;
    reassignment_count;
    status;
    created_at;
};
exports.SlaJob = SlaJob;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], SlaJob.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], SlaJob.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], SlaJob.prototype, "advisor_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lead_entity_1.Lead),
    (0, typeorm_1.JoinColumn)({ name: 'lead_id' }),
    __metadata("design:type", lead_entity_1.Lead)
], SlaJob.prototype, "lead", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => advisor_entity_1.Advisor),
    (0, typeorm_1.JoinColumn)({ name: 'advisor_id' }),
    __metadata("design:type", advisor_entity_1.Advisor)
], SlaJob.prototype, "advisor", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'CONTACT_SLA' }),
    __metadata("design:type", String)
], SlaJob.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], SlaJob.prototype, "due_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SlaJob.prototype, "reassignment_count", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SlaStatus,
        default: SlaStatus.PENDING,
    }),
    __metadata("design:type", String)
], SlaJob.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], SlaJob.prototype, "created_at", void 0);
exports.SlaJob = SlaJob = __decorate([
    (0, typeorm_1.Entity)('sla_jobs')
], SlaJob);
//# sourceMappingURL=sla-job.entity.js.map