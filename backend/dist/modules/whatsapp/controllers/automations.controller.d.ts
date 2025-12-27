import { AutomationsService } from '../services/automations.service';
import { AutomationConfig } from '../entities/automation.entity';
export declare class AutomationsController {
    private readonly automationsService;
    constructor(automationsService: AutomationsService);
    getConfig(name?: string): Promise<import("../entities/automation.entity").Automation | {
        name: string;
        isActive: false;
        config: null;
    }>;
    updateConfig(body: {
        name?: string;
        isActive: boolean;
        config: AutomationConfig;
    }): Promise<import("../entities/automation.entity").Automation>;
}
