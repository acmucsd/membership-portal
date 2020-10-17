import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { UserModel } from 'models/UserModel';
import * as moment from 'moment';
import { EventModel } from '../models/EventModel';
import { Uuid, PublicEvent, Event, EventSearchOptions, PublicEventFeedback } from '../types';
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

  public async getAllEvents(canSeeAttendanceCode = false, canSeeEventFeedback = false,
    options: EventSearchOptions): Promise<PublicEvent[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getAllEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode, canSeeEventFeedback));
  }

  public async getPastEvents(canSeeAttendanceCode = false, canSeeEventFeedback = false,
    options: EventSearchOptions): Promise<PublicEvent[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getPastEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode, canSeeEventFeedback));
  }

  public async getFutureEvents(canSeeAttendanceCode = false, canSeeEventFeedback = false,
    options: EventSearchOptions): Promise<PublicEvent[]> {
    const events = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .getFutureEvents(options));
    return events.map((e) => e.getPublicEvent(canSeeAttendanceCode, canSeeEventFeedback));
  }

  public async findByUuid(uuid: Uuid, canSeeAttendanceCode = false,
    canSeeEventFeedback = false): Promise<PublicEvent> {
    const event = await this.transactions.readOnly(async (txn) => Repositories
      .event(txn)
      .findByUuid(uuid));
    if (!event) throw new NotFoundError('Event not found');
    return event.getPublicEvent(canSeeAttendanceCode, canSeeEventFeedback);
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

  public async addEventFeedback(uuid: Uuid, feedback: string[], user: UserModel): Promise<PublicEventFeedback[]> {
    const eventFeedback = await this.transactions.readWrite(async (txn) => {
      const eventRepository = Repositories.event(txn);
      const attendanceRepository = Repositories.attendance(txn);
      const eventFeedbackRepository = Repositories.eventFeedback(txn);

      const event = await eventRepository.findByUuid(uuid);
      if (!event) throw new NotFoundError('Event not found');
      const hasAttendedEvent = await attendanceRepository.hasUserAttendedEvent(user, event);
      if (!hasAttendedEvent) throw new UserError('You have not attended this event to be able to provide feedback');
      const eventFeedbackSubmission = eventFeedbackRepository.getFeedbackByUser(user);
      if (eventFeedbackSubmission) throw new UserError('You cannot submit feedback more than once');
      const eventStart = moment(event.start).valueOf();
      const twoDaysPastEventEnd = moment(event.end).add(2, 'days').valueOf();
      if (moment.now() < eventStart) throw new UserError('You cannot submit feedback until the event has started');
      if (moment.now() > twoDaysPastEventEnd) {
        throw new UserError('You cannot submit feedback past 2 days '
        + 'of the event ending');
      }

      return eventFeedbackRepository.addEventFeedback(feedback, event, user);
    });
    return eventFeedback.getPublicEventFeedback();
  }
}
