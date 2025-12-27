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
exports.Score = void 0;
const typeorm_1 = require("typeorm");
const advisor_entity_1 = require("../../advisors/entities/advisor.entity");
const lead_entity_1 = require("../../leads/entities/lead.entity");
let Score = class Score {
    id;
    advisor_id;
    lead_id;
    advisor;
    lead;
    points;
    reason;
    created_at;
};
exports.Score = Score;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Score.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], Score.prototype, "advisor_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint' }),
    __metadata("design:type", Number)
], Score.prototype, "lead_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => advisor_entity_1.Advisor),
    (0, typeorm_1.JoinColumn)({ name: 'advisor_id' }),
    __metadata("design:type", advisor_entity_1.Advisor)
], Score.prototype, "advisor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => lead_entity_1.Lead),
    (0, typeorm_1.JoinColumn)({ name: 'lead_id' }),
    __metadata("design:type", lead_entity_1.Lead)
], Score.prototype, "lead", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], Score.prototype, "points", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Score.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Score.prototype, "created_at", void 0);
exports.Score = Score = __decorate([
    (0, typeorm_1.Entity)('scores')
], Score);
//# sourceMappingURL=score.entity.js.map