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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const assignment_entity_1 = require("./entities/assignment.entity");
let AssignmentsService = class AssignmentsService {
    assignmentsRepository;
    constructor(assignmentsRepository) {
        this.assignmentsRepository = assignmentsRepository;
    }
    async findActiveAssignment(leadId) {
        return this.assignmentsRepository.findOne({
            where: { lead_id: leadId, ended_at: (0, typeorm_2.IsNull)() },
        });
    }
    async reassign(leadId, oldAdvisorId, count) {
        const active = await this.findActiveAssignment(leadId);
        if (active) {
            active.ended_at = new Date();
            await this.assignmentsRepository.save(active);
        }
    }
    async createAssignment(leadId, advisorId) {
        const assignment = this.assignmentsRepository.create({
            lead_id: leadId,
            advisor_id: advisorId,
        });
        return this.assignmentsRepository.save(assignment);
    }
};
exports.AssignmentsService = AssignmentsService;
exports.AssignmentsService = AssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(assignment_entity_1.Assignment)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AssignmentsService);
//# sourceMappingURL=assignments.service.js.map