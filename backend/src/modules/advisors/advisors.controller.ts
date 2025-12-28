import {
  Controller,
  Post,
  Body,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { AdvisorsService } from './advisors.service';

@Controller('advisors')
export class AdvisorsController {
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Post('request-otp')
  async requestOtp(@Body() body: { name: string; phone: string }) {
    return this.advisorsService.requestOtp(body.name, body.phone);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { name: string; phone: string; pin?: string; otp?: string },
  ) {
    const pinToVerify = body.pin || body.otp;
    if (!pinToVerify) {
      throw new BadRequestException('El código PIN es requerido');
    }
    return this.advisorsService.verifyOtp(body.name, body.phone, pinToVerify);
  }

  @Get()
  findAll() {
    // This is handled by Supabase on the frontend usually, but good to have
    return [];
  }
}
