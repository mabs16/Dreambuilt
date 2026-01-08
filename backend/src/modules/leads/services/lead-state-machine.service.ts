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
      LeadStatus.PERDIDO,
    ],
    [LeadStatus.ASESOR_INFORMADO]: [LeadStatus.CONTACTADO, LeadStatus.PERDIDO],
    [LeadStatus.CONTACTADO]: [
      LeadStatus.CITA,
      LeadStatus.SEGUIMIENTO,
      LeadStatus.PERDIDO,
    ],
    [LeadStatus.CITA]: [
      LeadStatus.SEGUIMIENTO,
      LeadStatus.CIERRE,
      LeadStatus.PERDIDO,
    ],
    [LeadStatus.SEGUIMIENTO]: [
      LeadStatus.CITA,
      LeadStatus.CIERRE,
      LeadStatus.PERDIDO,
    ],
    [LeadStatus.CIERRE]: [],
    [LeadStatus.PERDIDO]: [],
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
