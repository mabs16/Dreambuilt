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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const lead_entity_1 = require("./entities/lead.entity");
const lead_note_entity_1 = require("./entities/lead-note.entity");
let LeadsService = class LeadsService {
    leadsRepository;
    notesRepository;
    constructor(leadsRepository, notesRepository) {
        this.leadsRepository = leadsRepository;
        this.notesRepository = notesRepository;
    }
    async findById(id) {
        const lead = await this.leadsRepository.findOne({ where: { id } });
        if (!lead)
            throw new common_1.NotFoundException(`Lead with ID ${id} not found`);
        return lead;
    }
    async findByPhone(phone) {
        return this.leadsRepository.findOne({ where: { phone } });
    }
    async createLead(data) {
        const lead = this.leadsRepository.create({
            ...data,
            status: lead_entity_1.LeadStatus.NUEVO,
        });
        return this.leadsRepository.save(lead);
    }
    async updateStatus(id, status) {
        const lead = await this.findById(id);
        lead.status = status;
        lead.updated_at = new Date();
        return this.leadsRepository.save(lead);
    }
    async updateName(id, name) {
        const lead = await this.findById(id);
        lead.name = name;
        lead.updated_at = new Date();
        return this.leadsRepository.save(lead);
    }
    async freezeForManualReview() {
    }
    async addNote(data) {
        const note = this.notesRepository.create({
            lead_id: data.leadId,
            advisor_id: data.advisorId,
            content: data.content,
            type: data.type || 'MANUAL',
        });
        return this.notesRepository.save(note);
    }
    async getNotes(leadId) {
        return this.notesRepository.find({
            where: { lead_id: leadId },
            order: { created_at: 'DESC' },
            relations: ['advisor'],
        });
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(lead_entity_1.Lead)),
    __param(1, (0, typeorm_1.InjectRepository)(lead_note_entity_1.LeadNote)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], LeadsService);
//# sourceMappingURL=leads.service.js.map