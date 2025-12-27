import { Repository } from 'typeorm';
import { Automation, AutomationConfig } from '../entities/automation.entity';
export declare class AutomationsService {
    private readonly automationRepository;
    private readonly logger;
    constructor(automationRepository: Repository<Automation>);
    getConfig(name?: string): Promise<Automation | null>;
    updateConfig(name: string, isActive: boolean, config: AutomationConfig): Promise<Automation>;
    isBotActive(name?: string): Promise<boolean>;
}
