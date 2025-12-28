import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from './entities/lead.entity';
import { LeadNote } from './entities/lead-note.entity';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadsRepository: Repository<Lead>,
    @InjectRepository(LeadNote)
    private readonly notesRepository: Repository<LeadNote>,
  ) {}

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
  }) {
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

  async updateName(id: number, name: string): Promise<Lead> {
    const lead = await this.findById(id);
    lead.name = name;
    lead.updated_at = new Date();
    return this.leadsRepository.save(lead);
  }

  async freezeForManualReview() {
    // In v1, "frozen" might just be an event and a special property or just staying in ASIGNADO
    // but marked in the UI. For now, let's update a metadata field (payload) in the lead if we had it,
    // or just emit an event "lead.manual_review_needed".
  }

  async addNote(data: {
    leadId: number;
    advisorId?: number;
    content: string;
    type?: string;
  }) {
    const note = this.notesRepository.create({
      lead_id: data.leadId,
      advisor_id: data.advisorId,
      content: data.content,
      type: data.type || 'MANUAL',
    });
    return this.notesRepository.save(note);
  }

  async getNotes(leadId: number) {
    return this.notesRepository.find({
      where: { lead_id: leadId },
      order: { created_at: 'DESC' },
      relations: ['advisor'],
    });
  }
}
