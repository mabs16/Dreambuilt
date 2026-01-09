import { Injectable, BadRequestException } from '@nestjs/common';
import { LeadStatus } from '../entities/lead.entity';

@Injectable()
export class LeadStateMachine {
  private readonly transitions: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NUEVO]: [
      LeadStatus.PRECALIFICADO,
      LeadStatus.PENDING_DISTRIBUTION,
    ],
    [LeadStatus.PENDING_DISTRIBUTION]: [LeadStatus.ASIGNADO, LeadStatus.NUEVO],
    [LeadStatus.PRECALIFICADO]: [LeadStatus.NUTRICION, LeadStatus.ASIGNADO],
    [LeadStatus.NUTRICION]: [LeadStatus.ASIGNADO],
    [LeadStatus.ASIGNADO]: [
      LeadStatus.ASESOR_INFORMADO,
      LeadStatus.CONTACTADO,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.ASESOR_INFORMADO]: [
      LeadStatus.CONTACTADO,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.CONTACTADO]: [
      LeadStatus.CITA,
      LeadStatus.SEGUIMIENTO,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.CITA]: [
      LeadStatus.SEGUIMIENTO,
      LeadStatus.RECORRIDO,
      LeadStatus.CIERRE,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.RECORRIDO]: [
      LeadStatus.SEGUIMIENTO,
      LeadStatus.CITA,
      LeadStatus.CIERRE,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.SEGUIMIENTO]: [
      LeadStatus.CITA,
      LeadStatus.CIERRE,
      LeadStatus.DESCARTADO,
    ],
    [LeadStatus.CIERRE]: [],
    [LeadStatus.DESCARTADO]: [],
  };

  validateTransition(current: LeadStatus, next: LeadStatus): void {
    const allowed = this.transitions[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Invalid transition from ${current} to ${next}`,
      );
    }
  }
}
