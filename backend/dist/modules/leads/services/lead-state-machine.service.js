"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadStateMachine = void 0;
const common_1 = require("@nestjs/common");
const lead_entity_1 = require("../entities/lead.entity");
let LeadStateMachine = class LeadStateMachine {
    transitions = {
        [lead_entity_1.LeadStatus.NUEVO]: [lead_entity_1.LeadStatus.PRECALIFICADO],
        [lead_entity_1.LeadStatus.PRECALIFICADO]: [lead_entity_1.LeadStatus.ASIGNADO],
        [lead_entity_1.LeadStatus.ASIGNADO]: [lead_entity_1.LeadStatus.CONTACTADO, lead_entity_1.LeadStatus.PERDIDO],
        [lead_entity_1.LeadStatus.CONTACTADO]: [lead_entity_1.LeadStatus.CITA, lead_entity_1.LeadStatus.SEGUIMIENTO, lead_entity_1.LeadStatus.PERDIDO],
        [lead_entity_1.LeadStatus.CITA]: [lead_entity_1.LeadStatus.SEGUIMIENTO, lead_entity_1.LeadStatus.CIERRE, lead_entity_1.LeadStatus.PERDIDO],
        [lead_entity_1.LeadStatus.SEGUIMIENTO]: [lead_entity_1.LeadStatus.CITA, lead_entity_1.LeadStatus.CIERRE, lead_entity_1.LeadStatus.PERDIDO],
        [lead_entity_1.LeadStatus.CIERRE]: [],
        [lead_entity_1.LeadStatus.PERDIDO]: [],
    };
    validateTransition(current, next) {
        const allowed = this.transitions[current];
        if (!allowed.includes(next)) {
            throw new common_1.BadRequestException(`Invalid transition from ${current} to ${next}`);
        }
    }
};
exports.LeadStateMachine = LeadStateMachine;
exports.LeadStateMachine = LeadStateMachine = __decorate([
    (0, common_1.Injectable)()
], LeadStateMachine);
//# sourceMappingURL=lead-state-machine.service.js.map