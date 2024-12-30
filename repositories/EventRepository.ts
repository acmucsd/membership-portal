import { DataSource, SelectQueryBuilder } from 'typeorm';
import Container from 'typedi';
import { EventSearchOptions, Uuid } from '../types';
import { EventModel } from '../models/EventModel';

export const EventRepository = Container.get(DataSource)
  .getRepository(EventModel)
  .extend({
    async upsertEvent(event: EventModel, changes?: Partial<EventModel>): Promise<EventModel> {
      if (changes) event = this.merge(event, changes);
      return this.save(event);
    },

    async getAllEvents(options: EventSearchOptions): Promise<EventModel[]> {
      return this.getBaseEventSearchQuery(options).getMany();
    },

    async getPastEvents(options: EventSearchOptions): Promise<EventModel[]> {
      return this.getBaseEventSearchQuery(options)
        .andWhere('"end" < :now')
        .setParameter('now', new Date())
        .getMany();
    },

    async getFutureEvents(options: EventSearchOptions): Promise<EventModel[]> {
      return this.getBaseEventSearchQuery(options)
        .andWhere('"end" >= :now')
        .setParameter('now', new Date())
        .getMany();
    },

    async findByUuid(uuid: Uuid): Promise<EventModel> {
      return this.findOne({ where: { uuid } });
    },

    async findByAttendanceCode(attendanceCode: string): Promise<EventModel> {
      return this.findOne({ where: { attendanceCode } });
    },

    async deleteEvent(event: EventModel): Promise<EventModel> {
      return this.remove(event);
    },

    async isUnusedAttendanceCode(attendanceCode: string): Promise<boolean> {
      const count = await this.count({ where: { attendanceCode } });
      return count === 0;
    },

    getBaseEventSearchQuery(options: EventSearchOptions): SelectQueryBuilder<EventModel> {
      let query = this.createQueryBuilder()
        .skip(options.offset)
        .take(options.limit)
        .orderBy('start', options.reverse ? 'DESC' : 'ASC');
      if (options.committee) {
        query = query
          .where('committee = :committee')
          .setParameter('committee', options.committee);
      }
      return query;
    },
  });
