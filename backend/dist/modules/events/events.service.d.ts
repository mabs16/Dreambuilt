import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
export declare class EventsService {
    private readonly eventsRepository;
    constructor(eventsRepository: Repository<Event>);
    create(data: {
        leadId: number;
        advisorId?: number;
        type: string;
        payload?: any;
    }): Promise<Event>;
}
