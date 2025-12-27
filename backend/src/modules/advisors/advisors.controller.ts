import { Controller, Post, Body, Get } from '@nestjs/common';
import { AdvisorsService } from './advisors.service';

@Controller('advisors')
export class AdvisorsController {
    constructor(private readonly advisorsService: AdvisorsService) { }

    @Post('request-otp')
    async requestOtp(@Body() body: { name: string; phone: string }) {
        return this.advisorsService.requestOtp(body.name, body.phone);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: { name: string; phone: string; pin: string }) {
        return this.advisorsService.verifyOtp(body.name, body.phone, body.pin);
    }

    @Get()
    async findAll() {
        // This is handled by Supabase on the frontend usually, but good to have
        return [];
    }
}
