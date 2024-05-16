import { EntityRepository, LessThanOrEqual, MoreThanOrEqual, SelectQueryBuilder } from 'typeorm';
import { EventSearchOptions, Uuid } from '../types';
import { EventModel } from '../models/EventModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(EventModel)
export class EventRepository extends BaseRepository<EventModel> {
  public async upsertEvent(event: EventModel, changes?: Partial<EventModel>): Promise<EventModel> {
    if (changes) event = EventModel.merge(event, changes);
    return this.repository.save(event);
  }

  public async getAllEvents(options: EventSearchOptions): Promise<EventModel[]> {
    return this.getBaseEventSearchQuery(options).getMany();
  }

  public async getPastEvents(options: EventSearchOptions): Promise<EventModel[]> {
    return this.getBaseEventSearchQuery(options)
      .andWhere('"end" < :now')
      .setParameter('now', new Date())
      .getMany();
  }

  public async getFutureEvents(options: EventSearchOptions): Promise<EventModel[]> {
    return this.getBaseEventSearchQuery(options)
      .andWhere('"end" >= :now')
      .setParameter('now', new Date())
      .getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<EventModel> {
    return this.repository.findOne({ uuid });
  }

  public async findByAttendanceCode(attendanceCode: string): Promise<EventModel> {
    // Find all events with the given attendance code
    const matchingEvents = await this.repository.find({ attendanceCode });

    // Find all events that are currently
    const validEvents = matchingEvents.filter((event) => !event.isTooEarlyToAttendEvent()
    && !event.isTooLateToAttendEvent());

    // If there are eligible events, return the first one
    if (validEvents.length > 0) {
      return validEvents[0];
    }

    // Otherwise, find the closest event to the current time
    const currentTime = new Date();
    let closestEvent = null;
    let closestTimeDifference = Infinity;

    matchingEvents.forEach((event) => {
      const eventStartTime = new Date(event.start);
      const timeDifference = Math.abs(eventStartTime.getTime() - currentTime.getTime());

      // Update closest event if necessary
      if (timeDifference < closestTimeDifference) {
        closestEvent = event;
        closestTimeDifference = timeDifference;
      }
    });

    return closestEvent;
  }

  public async deleteEvent(event: EventModel): Promise<EventModel> {
    return this.repository.remove(event);
  }

  public async isAvailableAttendanceCode(attendanceCode: string, start: Date, end: Date): Promise<boolean> {

    const bufferedStart = new Date(start);
    bufferedStart.setDate(bufferedStart.getDate() + 3);

    const bufferedEnd = new Date(end);
    bufferedEnd.setDate(bufferedEnd.getDate() - 3);

    const hasOverlap = await this.repository.find({
      where: [
        {
          attendanceCode,
          start: LessThanOrEqual(bufferedEnd),
          end: MoreThanOrEqual(bufferedStart),
        },
      ],
    });

    return hasOverlap.length === 0;
  }

  private getBaseEventSearchQuery(options: EventSearchOptions): SelectQueryBuilder<EventModel> {
    let query = this.repository.createQueryBuilder()
      .skip(options.offset)
      .take(options.limit)
      .orderBy('start', options.reverse ? 'DESC' : 'ASC');
    if (options.committee) {
      query = query
        .where('committee = :committee')
        .setParameter('committee', options.committee);
    }
    return query;
  }
}
