import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { LeadNote } from '../entities/lead-note.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepository: Repository<Lead>,
    @InjectRepository(LeadNote)
    private readonly notesRepository: Repository<LeadNote>,
  ) {}

  async findOldestPendingDistributionLead(): Promise<Lead | null> {
    return this.leadsRepository.findOne({
      where: { status: LeadStatus.PENDING_DISTRIBUTION },
      order: { created_at: 'ASC' },
    });
  }

  async findById(id: number): Promise<Lead> {
    const lead = await this.leadsRepository.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead with ID ${id} not found`);
    return lead;
  }

  async findByPhone(phone: string): Promise<Lead | null> {
    return this.leadsRepository.findOne({ where: { phone } });
  }

  async createLead(data: {
    name: string;
    phone: string;
    source: string;
    avatar_url?: string;
  }): Promise<Lead> {
    const lead = this.leadsRepository.create({
      ...data,
      status: LeadStatus.NUEVO,
    });
    return this.leadsRepository.save(lead);
  }

  async updateAvatar(id: number, avatarUrl: string): Promise<Lead> {
    const lead = await this.findById(id);
    lead.avatar_url = avatarUrl;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async updateStatus(id: number, status: LeadStatus): Promise<Lead> {
    const lead = await this.findById(id);
    lead.status = status;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async updateDisqualificationReason(
    id: number,
    reason: string,
  ): Promise<Lead> {
    const lead = await this.findById(id);
    lead.disqualification_reason = reason;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async addTag(id: number, tag: string): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead.tags) {
      lead.tags = [];
    }
    if (!lead.tags.includes(tag)) {
      lead.tags.push(tag);
      lead.updated_at = new Date();
      return this.leadsRepository.save(lead);
    }
    return lead;
  }

  async updateName(id: number, name: string): Promise<Lead> {
    const lead = await this.findById(id);
    lead.name = name;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async updateEmail(id: number, email: string): Promise<Lead> {
    const lead = await this.findById(id);
    lead.email = email;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async freezeForManualReview(): Promise<void> {
    // In v1, "frozen" might just be an event and a special property or just staying in ASIGNADO
    // but marked in the UI. For now, let's update a metadata field (payload) in the lead if we had it,
    // or just emit an event "lead.manual_review_needed".
  }

  async addNote(data: {
    leadId: number;
    advisorId?: number;
    content: string;
    type?: string;
  }): Promise<LeadNote> {
    const note = this.notesRepository.create({
      lead_id: data.leadId,
      advisor_id: data.advisorId,
      content: data.content,
      type: data.type || 'MANUAL',
    });
    return this.notesRepository.save(note);
  }

  async getNotes(leadId: number): Promise<LeadNote[]> {
    return this.notesRepository.find({
      where: { lead_id: leadId },
      order: { created_at: 'DESC' },
      relations: ['advisor'],
    });
  }

  async findLeadsWithNoNotesSince(
    hours: number,
    statuses: LeadStatus[],
  ): Promise<Lead[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    return this.leadsRepository
      .createQueryBuilder('lead')
      .where('lead.status IN (:...statuses)', { statuses })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(n.created_at)')
          .from(LeadNote, 'n')
          .where('n.lead_id = lead.id')
          .getQuery();

        return `COALESCE((${subQuery}), lead.created_at) < :cutoffDate`;
      })
      .setParameter('cutoffDate', cutoffDate)
      .getMany();
  }
}
