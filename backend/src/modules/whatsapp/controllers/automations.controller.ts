import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AutomationsService } from '../services/automations.service';
import { AutomationConfig } from '../entities/automation.entity';

@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  async getConfig(@Query('name') name: string = 'lead_qualification') {
    const config = await this.automationsService.getConfig(name);
    return config || { name, isActive: false, config: null };
  }

  @Post()
  async updateConfig(
    @Body()
    body: {
      name?: string;
      isActive: boolean;
      config: AutomationConfig;
    },
  ) {
    const name = body.name || 'lead_qualification';
    return this.automationsService.updateConfig(
      name,
      body.isActive,
      body.config,
    );
  }
}
