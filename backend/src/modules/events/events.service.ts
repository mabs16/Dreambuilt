import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Event } from './entities/event.entity';

@Injectable()
export class EventsService {
    constructor(
        @InjectRepository(Event)
        private readonly eventsRepository: Repository<Event>,
    ) { }

    @OnEvent('event.created')
    async create(data: { leadId: number; advisorId?: number; type: string; payload?: any }) {
        const event = this.eventsRepository.create(data);
        return this.eventsRepository.save(event);
    }
}
