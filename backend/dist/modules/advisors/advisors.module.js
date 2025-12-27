"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvisorsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const advisor_entity_1 = require("./entities/advisor.entity");
const advisors_service_1 = require("./advisors.service");
const advisors_controller_1 = require("./advisors.controller");
let AdvisorsModule = class AdvisorsModule {
};
exports.AdvisorsModule = AdvisorsModule;
exports.AdvisorsModule = AdvisorsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([advisor_entity_1.Advisor]),
        ],
        controllers: [advisors_controller_1.AdvisorsController],
        providers: [advisors_service_1.AdvisorsService],
        exports: [advisors_service_1.AdvisorsService],
    })
], AdvisorsModule);
//# sourceMappingURL=advisors.module.js.map