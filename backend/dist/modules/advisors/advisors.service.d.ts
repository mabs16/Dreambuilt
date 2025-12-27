import { Repository } from 'typeorm';
import { Advisor } from './entities/advisor.entity';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class AdvisorsService {
    private readonly advisorsRepository;
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private readonly redis;
    constructor(advisorsRepository: Repository<Advisor>, configService: ConfigService, eventEmitter: EventEmitter2);
    findByPhone(phone: string): Promise<Advisor | null>;
    findById(id: number): Promise<Advisor | null>;
    findFirstAvailable(): Promise<Advisor | null>;
    requestOtp(name: string, phone: string): Promise<{
        message: string;
    }>;
    verifyOtp(name: string, phone: string, pin: string): Promise<Advisor>;
}
