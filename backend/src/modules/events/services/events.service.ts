import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) {}

  @OnEvent('event.created')
  async create(data: {
    lead_id: number;
    advisor_id?: number;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<Event> {
    const event = this.eventsRepository.create(data);
    return this.eventsRepository.save(event);
  }
}
