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
var AutomationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const automation_entity_1 = require("../entities/automation.entity");
let AutomationsService = AutomationsService_1 = class AutomationsService {
    automationRepository;
    logger = new common_1.Logger(AutomationsService_1.name);
    constructor(automationRepository) {
        this.automationRepository = automationRepository;
    }
    async getConfig(name = 'lead_qualification') {
        return this.automationRepository.findOne({ where: { name } });
    }
    async updateConfig(name, isActive, config) {
        let automation = await this.getConfig(name);
        if (!automation) {
            automation = this.automationRepository.create({
                name,
                isActive,
                config,
            });
        }
        else {
            automation.isActive = isActive;
            if (config) {
                automation.config = config;
            }
        }
        return this.automationRepository.save(automation);
    }
    async isBotActive(name = 'lead_qualification') {
        const automation = await this.getConfig(name);
        return automation?.isActive || false;
    }
};
exports.AutomationsService = AutomationsService;
exports.AutomationsService = AutomationsService = AutomationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(automation_entity_1.Automation)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AutomationsService);
//# sourceMappingURL=automations.service.js.map