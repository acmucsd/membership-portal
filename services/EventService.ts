import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { EventModel } from '../models';
import { Uuid, PublicEvent, Event, EventSearchOptions } from '../types';
import { Repositories, TransactionsManager } from '../repositories';
import { UserError } from '../utils';

@Service()
export class EventService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  /**
   * Creates a new event
   *
   * @param event object with all the properties of the event
   * @returns The event that was created
   */
  public async create(event: Event): Promise<PublicEvent> {
    const eventCreated = await this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const isUnusedAttendanceCode = await eventRepository.isUnusedAttendanceCode(event.attendanceCode);
      if (!isUnusedAttendanceCode) throw new UserError('Attendance code has already been used');
      if (event.start > event.end) throw new UserError('Start date after end date');
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
      if (changes.attendanceCode !== currentEvent.attendanceCode) {
        const isUnusedAttendanceCode = await eventRepository.isUnusedAttendanceCode(changes.attendanceCode);
        if (!isUnusedAttendanceCode) throw new UserError('Attendance code has already been used');
      }
      return eventRepository.upsertEvent(currentEvent, changes);
    });
    return updatedEvent.getPublicEvent(true);
  }

  public async deleteByUuid(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const event = await eventRepository.findByUuid(uuid);
      if (!event) throw new NotFoundError('Event not found');
      const attendances = await Repositories.attendance(txn).getAttendancesForEvent(uuid);
      if (attendances.length > 0) throw new ForbiddenError('Cannot delete event that has attendances');
      await eventRepository.deleteEvent(event);
    });
  }
}
