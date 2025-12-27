"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const bullmq_1 = require("@nestjs/bullmq");
const configuration_1 = __importDefault(require("./config/configuration"));
const leads_module_1 = require("./modules/leads/leads.module");
const advisors_module_1 = require("./modules/advisors/advisors.module");
const whatsapp_module_1 = require("./modules/whatsapp/whatsapp.module");
const assignments_module_1 = require("./modules/assignments/assignments.module");
const events_module_1 = require("./modules/events/events.module");
const sla_module_1 = require("./modules/sla/sla.module");
const scores_module_1 = require("./modules/scores/scores.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    username: configService.get('database.username'),
                    password: configService.get('database.password'),
                    database: configService.get('database.database'),
                    autoLoadEntities: true,
                    synchronize: false,
                    ssl: { rejectUnauthorized: false },
                }),
                inject: [config_1.ConfigService],
            }),
            event_emitter_1.EventEmitterModule.forRoot(),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    connection: {
                        host: configService.get('redis.host'),
                        port: configService.get('redis.port'),
                        password: configService.get('redis.password'),
                        tls: configService.get('redis.tls'),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            leads_module_1.LeadsModule,
            advisors_module_1.AdvisorsModule,
            whatsapp_module_1.WhatsappModule,
            assignments_module_1.AssignmentsModule,
            events_module_1.EventsModule,
            sla_module_1.SlaModule,
            scores_module_1.ScoresModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map