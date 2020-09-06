import { EntityRepository, LessThan, MoreThanOrEqual } from 'typeorm';
import { Uuid } from 'types';
import { EventModel } from '@Models/EventModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(EventModel)
export class EventRepository extends BaseRepository<EventModel> {
  public async upsertEvent(event: EventModel, changes?: Partial<EventModel>): Promise<EventModel> {
    if (changes) event = EventModel.merge(event, changes);
    return this.repository.save(event);
  }

  public async getAllEvents(offset: number, limit: number): Promise<EventModel[]> {
    return this.repository.find({
      skip: offset,
      take: limit,
      order: { start: 'ASC' },
    });
  }

  public async getPastEvents(offset = 0, limit = 0): Promise<EventModel[]> {
    return this.repository.find({
      skip: offset,
      take: limit,
      where: { end: LessThan(new Date()) },
      order: { start: 'ASC' },
    });
  }

  public async getFutureEvents(offset = 0, limit = 0): Promise<EventModel[]> {
    return this.repository.find({
      skip: offset,
      take: limit,
      where: { end: MoreThanOrEqual(new Date()) },
      order: { start: 'ASC' },
    });
  }

  public async getEventsByCommittee(committee: string, offset = 0, limit = 100): Promise<EventModel[]> {
    return this.repository.find({
      skip: offset,
      take: limit,
      where: { committee },
      order: { start: 'ASC' },
    });
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
}
