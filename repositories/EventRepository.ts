import { EntityRepository, SelectQueryBuilder } from 'typeorm';
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
    return this.getBaseQuery(options).getMany();
  }

  public async getPastEvents(options: EventSearchOptions): Promise<EventModel[]> {
    return this.getBaseQuery(options)
      .andWhere('"end" < :now')
      .setParameter('now', new Date())
      .getMany();
  }

  public async getFutureEvents(options: EventSearchOptions): Promise<EventModel[]> {
    return this.getBaseQuery(options)
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

  public async isUnusedAttendanceCode(attendanceCode: string): Promise<boolean> {
    const count = await this.repository.count({ attendanceCode });
    return count === 0;
  }

  private getBaseQuery(options: EventSearchOptions): SelectQueryBuilder<EventModel> {
    let query = this.repository.createQueryBuilder()
      .skip(options.offset)
      .take(options.limit)
      .orderBy('start', 'ASC');
    if (options.committee) {
      query = query
        .where('committee = :committee')
        .setParameter('committee', options.committee);
    }
    return query;
  }
}
