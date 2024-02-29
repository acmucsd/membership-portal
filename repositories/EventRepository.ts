import { Between, EntityRepository, LessThanOrEqual, MoreThanOrEqual, SelectQueryBuilder } from 'typeorm';
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
    return this.repository.findOne({ attendanceCode });
  }

  public async deleteEvent(event: EventModel): Promise<EventModel> {
    return this.repository.remove(event);
  }

  public async isAvailableAttendanceCode(attendanceCode: string, start: Date, end: Date): Promise<boolean> {
    // Existing Event:  ------
    //      New Event:    ------

    // Existing Event:  ------
    //      New Event: -----
    const endsOrStartsDuring = await this.repository.find({
      where: [
        {
          attendanceCode,
          start: Between(start, end),
        },
        {
          attendanceCode,
          end: Between(start, end),
        },
      ],
    });

    // Existing Event:  ------
    //      New Event:   ---
    const totalOverlap = await this.repository.find({
      where: [
        {
          attendanceCode,
          start: LessThanOrEqual(start),
          end: MoreThanOrEqual(end),
        },
      ],
    });

    return endsOrStartsDuring.length === 0 && totalOverlap.length === 0;
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
