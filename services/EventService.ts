import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { EventModel } from '../models/EventModel';
import { Uuid, PublicEvent } from '../types';
import Repositories from '../repositories';
import { UserError } from '../utils/Errors';

@Service()
export default class EventService {
  @InjectManager()
  private entityManager: EntityManager;

  public async create(postEventRequest: Partial<EventModel>) {
    const event = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const isUnusedAttendanceCode = eventRepository.isUnusedAttendanceCode(postEventRequest.attendanceCode);
      if (!isUnusedAttendanceCode) throw new UserError('Attendance code has already been used');
      return eventRepository.upsertEvent(EventModel.create(postEventRequest));
    });
    return event.getPublicEvent();
  }

  public async getAllEvents(canSeeAttendanceCode = false, offset = 0, limit = 0): Promise<PublicEvent[]> {
    const events = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      return eventRepository.getAllEvents(offset, limit);
    });
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async getPastEvents(canSeeAttendanceCode = false, offset = 0, limit = 0): Promise<PublicEvent[]> {
    const events = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      return eventRepository.getPastEvents(offset, limit);
    });
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async getFutureEvents(canSeeAttendanceCode = false, offset = 0, limit = 0): Promise<PublicEvent[]> {
    const events = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      return eventRepository.getFutureEvents(offset, limit);
    });
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode));
  }

  public async findByUuid(uuid: Uuid, canSeeAttendanceCode = false): Promise<PublicEvent> {
    const event = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      return eventRepository.findByUuid(uuid);
    });
    if (!event) throw new NotFoundError('Event not found');
    return event.getPublicEvent(canSeeAttendanceCode);
  }

  public async updateByUuid(uuid: Uuid, changes: Partial<EventModel>): Promise<PublicEvent> {
    const updatedEvent = await this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const currentEvent = await eventRepository.findByUuid(uuid);
      if (!currentEvent) throw new NotFoundError();
      return eventRepository.upsertEvent(currentEvent, changes);
    });
    return updatedEvent.getPublicEvent(true);
  }

  public async deleteByUuid(uuid: Uuid): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const event = await eventRepository.findByUuid(uuid);
      if (!event) throw new NotFoundError();
      await eventRepository.deleteEvent(event);
    });
  }
}
