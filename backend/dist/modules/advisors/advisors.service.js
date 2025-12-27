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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AdvisorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisorsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const advisor_entity_1 = require("./entities/advisor.entity");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const ioredis_1 = __importDefault(require("ioredis"));
let AdvisorsService = AdvisorsService_1 = class AdvisorsService {
    advisorsRepository;
    configService;
    eventEmitter;
    logger = new common_1.Logger(AdvisorsService_1.name);
    redis;
    constructor(advisorsRepository, configService, eventEmitter) {
        this.advisorsRepository = advisorsRepository;
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        const redisConfig = this.configService.get('redis');
        if (!redisConfig) {
            throw new Error('Redis configuration not found');
        }
        this.redis = new ioredis_1.default({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            tls: redisConfig.tls,
        });
    }
    async findByPhone(phone) {
        return this.advisorsRepository.findOne({ where: { phone } });
    }
    async findById(id) {
        return this.advisorsRepository.findOne({ where: { id } });
    }
    async findFirstAvailable() {
        const advisors = await this.advisorsRepository.find({
            order: { id: 'ASC' },
            take: 1,
        });
        return advisors.length > 0 ? advisors[0] : null;
    }
    async requestOtp(name, phone) {
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        this.logger.log(`Generando OTP para ${phone}: ${pin}`);
        await this.redis.set(`otp:${phone}`, pin, 'EX', 300);
        this.eventEmitter.emit('advisor.otp_requested', {
            name,
            phone,
            pin,
        });
        return { message: 'OTP enviado' };
    }
    async verifyOtp(name, phone, pin) {
        const storedPin = await this.redis.get(`otp:${phone}`);
        if (!storedPin || storedPin !== pin) {
            throw new common_1.BadRequestException('Código PIN inválido o expirado');
        }
        const advisor = this.advisorsRepository.create({
            name,
            phone,
            score: 0,
        });
        const savedAdvisor = await this.advisorsRepository.save(advisor);
        await this.redis.del(`otp:${phone}`);
        return savedAdvisor;
    }
};
exports.AdvisorsService = AdvisorsService;
exports.AdvisorsService = AdvisorsService = AdvisorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(advisor_entity_1.Advisor)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService,
        event_emitter_1.EventEmitter2])
], AdvisorsService);
//# sourceMappingURL=advisors.service.js.map