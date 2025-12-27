"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisorsController = void 0;
const common_1 = require("@nestjs/common");
const advisors_service_1 = require("./advisors.service");
let AdvisorsController = class AdvisorsController {
    advisorsService;
    constructor(advisorsService) {
        this.advisorsService = advisorsService;
    }
    async requestOtp(body) {
        return this.advisorsService.requestOtp(body.name, body.phone);
    }
    async verifyOtp(body) {
        return this.advisorsService.verifyOtp(body.name, body.phone, body.pin);
    }
    async findAll() {
        return [];
    }
};
exports.AdvisorsController = AdvisorsController;
__decorate([
    (0, common_1.Post)('request-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvisorsController.prototype, "requestOtp", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdvisorsController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdvisorsController.prototype, "findAll", null);
exports.AdvisorsController = AdvisorsController = __decorate([
    (0, common_1.Controller)('advisors'),
    __metadata("design:paramtypes", [advisors_service_1.AdvisorsService])
], AdvisorsController);
//# sourceMappingURL=advisors.controller.js.map