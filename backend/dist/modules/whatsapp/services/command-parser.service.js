"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandParser = exports.CommandType = void 0;
const common_1 = require("@nestjs/common");
var CommandType;
(function (CommandType) {
    CommandType["ACTIVAR"] = "ACTIVAR";
    CommandType["CONTACTADO"] = "CONTACTADO";
    CommandType["CITA"] = "CITA";
    CommandType["SEGUIMIENTO"] = "SEGUIMIENTO";
    CommandType["PERDIDO"] = "PERDIDO";
    CommandType["CIERRE"] = "CIERRE";
    CommandType["INTENTO_CONTACTO"] = "INTENTO";
    CommandType["NOTAS"] = "NOTAS";
    CommandType["INFO"] = "INFO";
})(CommandType || (exports.CommandType = CommandType = {}));
let CommandParser = class CommandParser {
    commandRegex = /^(?:(ACTIVAR|CONTACTADO|CITA|SEGUIMIENTO|PERDIDO|CIERRE|INTENTO|NOTAS|INFO)\s+(\d+)|(\d+)\s+(ACTIVAR|CONTACTADO|CITA|SEGUIMIENTO|PERDIDO|CIERRE|INTENTO|NOTAS|INFO))(?:\s+(.*))?$/i;
    parse(message) {
        const match = message.trim().match(this.commandRegex);
        if (!match) {
            throw new common_1.BadRequestException('Formato de comando inválido. Usa: "[ID] [COMANDO]" (Ej: 123 CONTACTADO)');
        }
        let typeStr = '';
        let leadIdStr = '';
        const value = match[5] || undefined;
        if (match[1]) {
            typeStr = match[1].toUpperCase();
            leadIdStr = match[2];
        }
        else if (match[3]) {
            leadIdStr = match[3];
            typeStr = match[4].toUpperCase();
        }
        const leadId = parseInt(leadIdStr, 10);
        if (isNaN(leadId)) {
            throw new common_1.BadRequestException('El ID del Lead debe ser un número válido.');
        }
        const type = typeStr === 'INTENTO'
            ? CommandType.INTENTO_CONTACTO
            : typeStr;
        return { type, leadId, value };
    }
};
exports.CommandParser = CommandParser;
exports.CommandParser = CommandParser = __decorate([
    (0, common_1.Injectable)()
], CommandParser);
//# sourceMappingURL=command-parser.service.js.map