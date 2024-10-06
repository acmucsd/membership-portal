import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { EventModel } from '../models/EventModel';
import { Uuid, Event, EventSearchOptions } from '../types';
import Repositories, { TransactionsManager } from '../repositories';
import { UserError } from '../utils/Errors';

@Service()
export default class EventService {
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
  public async create(event: Event): Promise<EventModel> {
    const eventCreated = await this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const isUnusedAttendanceCode = await eventRepository.isUnusedAttendanceCode(event.attendanceCode);
      if (!isUnusedAttendanceCode) throw new UserError('Attendance code has already been used');
      if (event.start > event.end) throw new UserError('Start date after end date');
      return eventRepository.upsertEvent(EventModel.create(event));
    });
    return eventCreated;
  }

  public async getAllEvents(
    options: EventSearchOptions,
  ): Promise<EventModel[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories.event(txn).getAllEvents(options));
    return events;
  }

  public async getPastEvents(
    options: EventSearchOptions,
  ): Promise<EventModel[]> {
    options.reverse ??= true;
    const events = await this.transactions.readOnly(async (txn) => Repositories.event(txn).getPastEvents(options));
    return events;
  }

  public async getFutureEvents(
    options: EventSearchOptions,
  ): Promise<EventModel[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories.event(txn).getFutureEvents(options));
    return events;
  }

  public async findByUuid(uuid: Uuid): Promise<EventModel> {
    const event = await this.transactions.readOnly(async (txn) => Repositories.event(txn).findByUuid(uuid));
    if (!event) throw new NotFoundError('Event not found');
    return event;
  }

  public async updateByUuid(
    uuid: Uuid,
    changes: Partial<EventModel>,
  ): Promise<EventModel> {
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
    return updatedEvent;
  }

  public async deleteByUuid(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const event = await eventRepository.findByUuid(uuid);
      if (!event) throw new NotFoundError('Event not found');
      const attendances = await Repositories.attendance(
        txn,
      ).getAttendancesForEvent(uuid);
      if (attendances.length > 0) throw new ForbiddenError('Cannot delete event that has attendances');
      await eventRepository.deleteEvent(event);
    });
  }
}
