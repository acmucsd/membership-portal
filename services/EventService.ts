import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { EventModel } from '../models/EventModel';
import { Uuid, PublicEvent, Event, EventSearchOptions } from '../types';
import Repositories, { TransactionsManager } from '../repositories';
import { UserError } from '../utils/Errors';

@Service()
export default class EventService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async create(event: Event) {
    const eventCreated = await this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const isUnusedAttendanceCode = eventRepository.isUnusedAttendanceCode(event.attendanceCode);
      if (!isUnusedAttendanceCode) throw new UserError('Attendance code has already been used');
      return eventRepository.upsertEvent(EventModel.create(event));
    });
    return eventCreated.getPublicEvent();
  }

  public async getAllEvents(canSeeAttendanceCode = false, options: EventSearchOptions): Promise<PublicEvent[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getAllEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async getPastEvents(canSeeAttendanceCode = false, options: EventSearchOptions): Promise<PublicEvent[]> {
    options.reverse ??= true;
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getPastEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async getFutureEvents(canSeeAttendanceCode = false, options: EventSearchOptions): Promise<PublicEvent[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getFutureEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async findByUuid(uuid: Uuid, canSeeAttendanceCode = false): Promise<PublicEvent> {
    const event = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .findByUuid(uuid));
    if (!event) throw new NotFoundError('Event not found');
    return event.getPublicEvent(canSeeAttendanceCode);
  }

  public async updateByUuid(uuid: Uuid, changes: Partial<EventModel>): Promise<PublicEvent> {
    const updatedEvent = await this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const currentEvent = await eventRepository.findByUuid(uuid);
      if (!currentEvent) throw new NotFoundError('Event not found');
      return eventRepository.upsertEvent(currentEvent, changes);
    });
    return updatedEvent.getPublicEvent(true);
  }

  public async deleteByUuid(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const event = await eventRepository.findByUuid(uuid);
      if (!event) throw new NotFoundError('Event not found');
      await eventRepository.deleteEvent(event);
    });
  }
}
