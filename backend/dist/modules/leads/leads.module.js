"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const lead_entity_1 = require("./entities/lead.entity");
const lead_note_entity_1 = require("./entities/lead-note.entity");
const leads_service_1 = require("./leads.service");
const lead_state_machine_service_1 = require("./services/lead-state-machine.service");
const pipeline_service_1 = require("./services/pipeline.service");
const scores_module_1 = require("../scores/scores.module");
const sla_module_1 = require("../sla/sla.module");
let LeadsModule = class LeadsModule {
};
exports.LeadsModule = LeadsModule;
exports.LeadsModule = LeadsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([lead_entity_1.Lead, lead_note_entity_1.LeadNote]),
            (0, common_1.forwardRef)(() => scores_module_1.ScoresModule),
            (0, common_1.forwardRef)(() => sla_module_1.SlaModule),
        ],
        providers: [leads_service_1.LeadsService, lead_state_machine_service_1.LeadStateMachine, pipeline_service_1.PipelineService],
        exports: [leads_service_1.LeadsService, lead_state_machine_service_1.LeadStateMachine, pipeline_service_1.PipelineService],
    })
], LeadsModule);
//# sourceMappingURL=leads.module.js.map