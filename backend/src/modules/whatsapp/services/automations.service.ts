import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation, AutomationConfig } from '../entities/automation.entity';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    @InjectRepository(Automation)
    private readonly automationRepository: Repository<Automation>,
  ) {}

  async getConfig(name: string = 'lead_qualification') {
    return this.automationRepository.findOne({ where: { name } });
  }

  async updateConfig(
    name: string,
    isActive: boolean,
    config: AutomationConfig,
  ) {
    let automation = await this.getConfig(name);
    if (!automation) {
      automation = this.automationRepository.create({
        name,
        isActive,
        config,
      });
    } else {
      automation.isActive = isActive;
      if (config) {
        automation.config = config;
      }
    }
    return this.automationRepository.save(automation);
  }

  async isBotActive(name: string = 'lead_qualification') {
    const automation = await this.getConfig(name);
    return automation?.isActive || false;
  }
}
