import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationsService } from './automations.service';
import { WhatsappService } from './whatsapp.service';
import { AdvisorsService } from '../../advisors/services/advisors.service';
import { AdvisorAutomationConfig } from '../entities/automation.entity';

@Injectable()
export class RollCallService {
  private readonly logger = new Logger(RollCallService.name);
  private lastRunMinute: string = '';

  constructor(
    private readonly automationsService: AutomationsService,
    private readonly whatsappService: WhatsappService,
    private readonly advisorsService: AdvisorsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkRollCallSchedule() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Prevent double execution in the same minute
    if (this.lastRunMinute === currentTime) return;
    this.lastRunMinute = currentTime;

    try {
      const autoConfig =
        await this.automationsService.getConfig('advisor_automation');
      if (!autoConfig || !autoConfig.isActive) return;

      const config = autoConfig.config as AdvisorAutomationConfig;

      if (
        !config.rollCallEnabled ||
        !config.rollCallSchedules ||
        config.rollCallSchedules.length === 0
      ) {
        return;
      }

      // Check if current time is in the schedule
      if (config.rollCallSchedules.includes(currentTime)) {
        this.logger.log(
          `⏰ Ejecutando Pase de Lista programado a las ${currentTime}`,
        );
        await this.executeRollCall(config);
      }
    } catch (error) {
      this.logger.error(`Error checking roll call schedule: ${error.message}`);
    }
  }

  async executeRollCall(config: AdvisorAutomationConfig) {
    try {
      const advisors = await this.advisorsService.findAll();
      const activeAdvisors = advisors.filter((a) => a.phone);

      const message =
        config.rollCallMessage ||
        "📢 *PASE DE LISTA*\n\nPor favor reporta tu asistencia respondiendo con 'PRESENTE' o tu ubicación actual.";

      this.logger.log(
        `Enviando pase de lista a ${activeAdvisors.length} asesores activos.`,
      );

      for (const advisor of activeAdvisors) {
        try {
          await this.whatsappService.sendWhatsappMessage(
            advisor.phone,
            message,
          );
          this.logger.debug(
            `Pase de lista enviado a ${advisor.name} (${advisor.phone})`,
          );
        } catch (error) {
          this.logger.error(
            `Error enviando pase de lista a ${advisor.name} (${advisor.phone}): ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error executing roll call: ${error.message}`);
    }
  }
}
