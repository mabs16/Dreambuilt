import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Advisor } from './entities/advisor.entity';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { ConnectionOptions } from 'tls';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: ConnectionOptions;
}

@Injectable()
export class AdvisorsService {
  private readonly logger = new Logger(AdvisorsService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Advisor)
    private readonly advisorsRepository: Repository<Advisor>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const redisConfig = this.configService.get<RedisConfig>('redis');
    if (!redisConfig) {
      throw new Error('Redis configuration not found');
    }
    this.redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      tls: redisConfig.tls,
    });
  }

  async findByPhone(phone: string): Promise<Advisor | null> {
    return this.advisorsRepository.findOne({ where: { phone } });
  }

  async findById(id: number): Promise<Advisor | null> {
    return this.advisorsRepository.findOne({ where: { id } });
  }

  async findFirstAvailable(): Promise<Advisor | null> {
    // For v1, simplistically return the first advisor found
    const advisors = await this.advisorsRepository.find({
      order: { id: 'ASC' },
      take: 1,
    });
    return advisors.length > 0 ? advisors[0] : null;
  }

  async requestOtp(name: string, phone: string) {
    // Generate 6 digit PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    this.logger.log(`Generando OTP para ${phone}: ${pin}`);

    // Store in Redis with 5 min TTL
    await this.redis.set(`otp:${phone}`, pin, 'EX', 300);

    // Emit event for WhatsApp service to handle sending
    this.eventEmitter.emit('advisor.otp_requested', {
      name,
      phone,
      pin,
    });

    return { message: 'OTP enviado' };
  }

  async verifyOtp(name: string, phone: string, pin: string) {
    const storedPin = await this.redis.get(`otp:${phone}`);

    if (!storedPin || storedPin !== pin) {
      throw new BadRequestException('Código PIN inválido o expirado');
    }

    // Valid OTP, create advisor
    const advisor = this.advisorsRepository.create({
      name,
      phone,
      score: 0,
    });

    const savedAdvisor = await this.advisorsRepository.save(advisor);

    // Clear OTP
    await this.redis.del(`otp:${phone}`);

    return savedAdvisor;
  }
}
