"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const whatsapp_controller_1 = require("./controllers/whatsapp.controller");
const whatsapp_service_1 = require("./services/whatsapp.service");
const command_parser_service_1 = require("./services/command-parser.service");
const automations_service_1 = require("./services/automations.service");
const gemini_service_1 = require("./services/gemini.service");
const advisors_module_1 = require("../advisors/advisors.module");
const assignments_module_1 = require("../assignments/assignments.module");
const leads_module_1 = require("../leads/leads.module");
const message_entity_1 = require("./entities/message.entity");
const automation_entity_1 = require("./entities/automation.entity");
const automations_controller_1 = require("./controllers/automations.controller");
let WhatsappModule = class WhatsappModule {
};
exports.WhatsappModule = WhatsappModule;
exports.WhatsappModule = WhatsappModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([message_entity_1.Message, automation_entity_1.Automation]),
            advisors_module_1.AdvisorsModule,
            assignments_module_1.AssignmentsModule,
            (0, common_1.forwardRef)(() => leads_module_1.LeadsModule)
        ],
        controllers: [whatsapp_controller_1.WhatsappController, automations_controller_1.AutomationsController],
        providers: [whatsapp_service_1.WhatsappService, command_parser_service_1.CommandParser, automations_service_1.AutomationsService, gemini_service_1.GeminiService],
        exports: [whatsapp_service_1.WhatsappService, automations_service_1.AutomationsService],
    })
], WhatsappModule);
//# sourceMappingURL=whatsapp.module.js.map