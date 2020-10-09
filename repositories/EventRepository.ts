import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { UserModel } from '../models/UserModel';
import { EventFeedbackModel } from '../models/EventFeedbackModel';
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
    return this.getBaseFindEventQuery().where({ uuid }).getOne();
  }

  public async findByAttendanceCode(attendanceCode: string): Promise<EventModel> {
    return this.getBaseFindEventQuery().where({ attendanceCode }).getOne();
  }

  public async deleteEvent(event: EventModel): Promise<EventModel> {
    return this.repository.remove(event);
  }

  public async isUnusedAttendanceCode(attendanceCode: string): Promise<boolean> {
    const count = await this.repository.count({ attendanceCode });
    return count === 0;
  }

  private getBaseEventSearchQuery(options: EventSearchOptions): SelectQueryBuilder<EventModel> {
    let query = this.getBaseFindEventQuery()
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

  private getBaseFindEventQuery(): SelectQueryBuilder<EventModel> {
    return this.repository.createQueryBuilder('event')
      .leftJoinAndSelect('event.feedback', 'feedback')
      .leftJoinAndSelect('feedback.user', 'feedback.user');
  }
}

@EntityRepository(EventFeedbackModel)
export class EventFeedbackRepository extends BaseRepository<EventFeedbackModel> {
  public async addEventFeedback(feedback: string[], event: EventModel, user: UserModel): Promise<EventFeedbackModel[]> {
    const eventFeedback = feedback.map((fb) => EventFeedbackModel.create({
      user,
      event,
      feedback: fb,
    }));
    return this.repository.save(eventFeedback);
  }
}
