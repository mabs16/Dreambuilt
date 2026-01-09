import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Advisor } from '../entities/advisor.entity';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { ConnectionOptions } from 'tls';
import { Cron, CronExpression } from '@nestjs/schedule';

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

    if (!redisConfig || !redisConfig.host) {
      this.logger.error(
        '❌ Redis configuration not found or incomplete in AdvisorsService',
      );
    }

    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      tls: redisConfig?.tls,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => {
      // Suppress connection errors to avoid noise if Redis is intentionally missing
      this.logger.warn(
        `Redis connection warning in AdvisorsService: ${err.message}`,
      );
    });
  }

  async findByPhone(phone: string): Promise<Advisor | null> {
    return this.advisorsRepository.findOne({ where: { phone } });
  }

  async findById(id: number): Promise<Advisor | null> {
    return this.advisorsRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<Advisor[]> {
    return this.advisorsRepository.find({
      order: { score: 'DESC' },
    });
  }

  async findFirstAvailable(): Promise<Advisor | null> {
    // Find advisor with status 'available' and valid expiration
    return this.advisorsRepository.findOne({
      where: {
        status: 'available',
        availability_expires_at: MoreThan(new Date()),
      },
      order: { score: 'DESC' },
    });
  }

  async setAvailability(id: number, available: boolean): Promise<Advisor> {
    const advisor = await this.findById(id);
    if (!advisor) throw new BadRequestException('Advisor not found');

    if (available) {
      advisor.status = 'available';
      advisor.availability_started_at = new Date();
      // Set expiration to 24 hours from now
      advisor.availability_expires_at = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      );
    } else {
      advisor.status = 'unavailable';
      advisor.availability_expires_at = null; // Clear expiration
    }
    advisor.last_message_at = new Date();

    const saved = await this.advisorsRepository.save(advisor);
    this.logger.log(
      `Advisor ${id} availability set to ${available} (expires: ${advisor.availability_expires_at?.toISOString() || 'never'})`,
    );
    return saved;
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkAvailabilityExpiration() {
    this.logger.log('Running availability expiration check...');
    const now = new Date();

    const expiredAdvisors = await this.advisorsRepository.find({
      where: {
        status: 'available',
        availability_expires_at: LessThan(now),
      },
    });

    if (expiredAdvisors.length > 0) {
      this.logger.log(
        `Found ${expiredAdvisors.length} expired advisors. Deactivating...`,
      );
      for (const advisor of expiredAdvisors) {
        advisor.status = 'unavailable';
        advisor.availability_expires_at = null;
        await this.advisorsRepository.save(advisor);
      }
    }
  }

  async remove(id: number): Promise<void> {
    await this.advisorsRepository.delete(id);
    this.logger.log(`Advisor ${id} deleted`);
  }

  async requestOtp(name: string, phone: string): Promise<{ message: string }> {
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

  async verifyOtp(name: string, phone: string, pin: string): Promise<Advisor> {
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
