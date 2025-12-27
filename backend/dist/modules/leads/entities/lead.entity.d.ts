export declare enum LeadStatus {
    NUEVO = "NUEVO",
    PRECALIFICADO = "PRECALIFICADO",
    ASIGNADO = "ASIGNADO",
    CONTACTADO = "CONTACTADO",
    CITA = "CITA",
    SEGUIMIENTO = "SEGUIMIENTO",
    CIERRE = "CIERRE",
    PERDIDO = "PERDIDO"
}
export declare class Lead {
    id: number;
    name: string;
    phone: string;
    source: string;
    status: LeadStatus;
    created_at: Date;
    updated_at: Date;
}
