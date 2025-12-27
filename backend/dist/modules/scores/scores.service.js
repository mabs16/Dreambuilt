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
exports.ScoresService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const score_entity_1 = require("./entities/score.entity");
const advisor_entity_1 = require("../advisors/entities/advisor.entity");
let ScoresService = class ScoresService {
    scoreRepository;
    advisorRepository;
    constructor(scoreRepository, advisorRepository) {
        this.scoreRepository = scoreRepository;
        this.advisorRepository = advisorRepository;
    }
    async addScore(advisorId, leadId, points, reason) {
        const score = this.scoreRepository.create({
            advisor_id: advisorId,
            lead_id: leadId,
            points,
            reason,
        });
        await this.scoreRepository.save(score);
        await this.advisorRepository.increment({ id: advisorId }, 'score', points);
        return score;
    }
};
exports.ScoresService = ScoresService;
exports.ScoresService = ScoresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(score_entity_1.Score)),
    __param(1, (0, typeorm_1.InjectRepository)(advisor_entity_1.Advisor)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ScoresService);
//# sourceMappingURL=scores.service.js.map