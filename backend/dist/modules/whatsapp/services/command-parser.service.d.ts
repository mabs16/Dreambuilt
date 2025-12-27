export declare enum CommandType {
    ACTIVAR = "ACTIVAR",
    CONTACTADO = "CONTACTADO",
    CITA = "CITA",
    SEGUIMIENTO = "SEGUIMIENTO",
    PERDIDO = "PERDIDO",
    CIERRE = "CIERRE",
    INTENTO_CONTACTO = "INTENTO",
    NOTAS = "NOTAS",
    INFO = "INFO"
}
export interface ParsedCommand {
    type: CommandType;
    leadId: number;
    value?: string;
}
export declare class CommandParser {
    private readonly commandRegex;
    parse(message: string): ParsedCommand;
}
