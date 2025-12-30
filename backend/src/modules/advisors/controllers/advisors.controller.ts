import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { AdvisorsService } from '../services/advisors.service';
import { Advisor } from '../entities/advisor.entity';

@Controller('advisors')
export class AdvisorsController {
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Post('request-otp')
  async requestOtp(
    @Body() body: { name: string; phone: string },
  ): Promise<{ message: string }> {
    return await this.advisorsService.requestOtp(body.name, body.phone);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { name: string; phone: string; pin?: string; otp?: string },
  ): Promise<Advisor> {
    const pinToVerify = body.pin || body.otp;
    if (!pinToVerify) {
      throw new BadRequestException('El código PIN es requerido');
    }
    return await this.advisorsService.verifyOtp(
      body.name,
      body.phone,
      pinToVerify,
    );
  }

  @Get()
  async findAll(): Promise<Advisor[]> {
    return await this.advisorsService.findAll();
  }
}
