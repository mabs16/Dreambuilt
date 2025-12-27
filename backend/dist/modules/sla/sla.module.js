"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bullmq_1 = require("@nestjs/bullmq");
const sla_job_entity_1 = require("./entities/sla-job.entity");
const sla_service_1 = require("./services/sla.service");
const sla_processor_1 = require("./processors/sla.processor");
const leads_module_1 = require("../leads/leads.module");
const assignments_module_1 = require("../assignments/assignments.module");
const scores_module_1 = require("../scores/scores.module");
const whatsapp_module_1 = require("../whatsapp/whatsapp.module");
const advisors_module_1 = require("../advisors/advisors.module");
let SlaModule = class SlaModule {
};
exports.SlaModule = SlaModule;
exports.SlaModule = SlaModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([sla_job_entity_1.SlaJob]),
            bullmq_1.BullModule.registerQueue({
                name: 'sla-queue',
            }),
            (0, common_1.forwardRef)(() => leads_module_1.LeadsModule),
            assignments_module_1.AssignmentsModule,
            (0, common_1.forwardRef)(() => scores_module_1.ScoresModule),
            (0, common_1.forwardRef)(() => whatsapp_module_1.WhatsappModule),
            advisors_module_1.AdvisorsModule,
        ],
        providers: [sla_service_1.SlaService, sla_processor_1.SlaProcessor],
        exports: [sla_service_1.SlaService],
    })
], SlaModule);
//# sourceMappingURL=sla.module.js.map