import { AdvisorsService } from './advisors.service';
export declare class AdvisorsController {
    private readonly advisorsService;
    constructor(advisorsService: AdvisorsService);
    requestOtp(body: {
        name: string;
        phone: string;
    }): Promise<{
        message: string;
    }>;
    verifyOtp(body: {
        name: string;
        phone: string;
        pin: string;
    }): Promise<import("./entities/advisor.entity").Advisor>;
    findAll(): Promise<never[]>;
}
