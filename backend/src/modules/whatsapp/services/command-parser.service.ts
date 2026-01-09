import { Injectable, BadRequestException } from '@nestjs/common';

export enum CommandType {
  ACTIVAR = 'ACTIVAR',
  CONTACTADO = 'CONTACTADO',
  CITA = 'CITA',
  RECORRIDO = 'RECORRIDO',
  SEGUIMIENTO = 'SEGUIMIENTO',
  DESCARTADO = 'DESCARTADO',
  CIERRE = 'CIERRE',
  INTENTO_CONTACTO = 'INTENTO',
  NOTAS = 'NOTAS',
  INFO = 'INFO',
  REJECT = 'REJECT',
  SIGUIENTE = 'SIGUIENTE',
}

export interface ParsedCommand {
  type: CommandType;
  leadId?: number;
  value?: string;
}

@Injectable()
export class CommandParser {
  // Matches: [COMMAND] [ID] [OPTIONAL_VALUE] or [ID] [COMMAND] [OPTIONAL_VALUE]
  private readonly commandRegex =
    /^(?:(ACTIVAR|CONTACTADO|CITA|RECORRIDO|SEGUIMIENTO|DESCARTADO|CIERRE|INTENTO|NOTAS|INFO|REJECT)\s+(\d+)|(\d+)\s+(ACTIVAR|CONTACTADO|CITA|RECORRIDO|SEGUIMIENTO|DESCARTADO|CIERRE|INTENTO|NOTAS|INFO|REJECT))(?:\s+(.*))?$/i;

  parse(message: string): ParsedCommand {
    const trimmed = message.trim();

    // Check for global commands (no ID required)
    if (trimmed.toUpperCase() === 'SIGUIENTE') {
      return { type: CommandType.SIGUIENTE };
    }

    const match = trimmed.match(this.commandRegex);

    if (!match) {
      throw new BadRequestException(
        'Formato de comando inválido. Usa: "[ID] [COMANDO]" (Ej: 123 CONTACTADO)',
      );
    }

    let typeStr = '';
    let leadIdStr = '';
    const value = match[5] || undefined;

    if (match[1]) {
      // Caso: COMANDO ID (Ej: CONTACTADO 123)
      typeStr = match[1].toUpperCase();
      leadIdStr = match[2];
    } else if (match[3]) {
      // Caso: ID COMANDO (Ej: 123 CONTACTADO)
      leadIdStr = match[3];
      typeStr = match[4].toUpperCase();
    }

    const leadId = parseInt(leadIdStr, 10);
    if (isNaN(leadId)) {
      throw new BadRequestException(
        'El ID del Lead debe ser un número válido.',
      );
    }

    // Mapeo especial para comandos
    let type: CommandType;

    switch (typeStr) {
      case 'INTENTO':
        type = CommandType.INTENTO_CONTACTO;
        break;
      case 'RECHAZAR':
      case 'REJECT':
        type = CommandType.REJECT;
        break;
      default:
        type = typeStr as CommandType;
    }

    return { type, leadId, value };
  }
}
