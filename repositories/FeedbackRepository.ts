import { DataSource, SelectQueryBuilder } from 'typeorm';
import Container from 'typedi';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { FeedbackSearchOptions, Uuid } from '../types';

export const FeedbackRepository = Container.get(DataSource)
  .getRepository(FeedbackModel)
  .extend({
    async getAllFeedback(options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
      return this.getBaseFindQuery(options).getMany();
    },

    async findByUuid(uuid: Uuid): Promise<FeedbackModel> {
      return this.getBaseFindQuery({}).where({ uuid }).getOne();
    },

    async getStandardUserFeedback(user: UserModel, options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
      let query = this.getBaseFindQuery(options);
      query = query.andWhere('feedback.user = :user', { user: user.uuid });

      return query.getMany();
    },

    async getAllFeedbackForUser(user: UserModel, options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
      return this.getBaseFindQuery(options).where({ user }).getMany();
    },

    async upsertFeedback(feedback: FeedbackModel,
      changes?: Partial<FeedbackModel>): Promise<FeedbackModel> {
      if (changes) feedback = FeedbackModel.merge(feedback, changes) as FeedbackModel;
      return this.repository.save(feedback);
    },

    async hasUserSubmittedFeedback(user: UserModel, event: EventModel): Promise<boolean> {
      const count = await this.repository.count({
        where: { user, event },
      });
      return count > 0;
    },

    getBaseFindQuery(options: FeedbackSearchOptions): SelectQueryBuilder<FeedbackModel> {
      let query = this.repository.createQueryBuilder('feedback')
        .leftJoinAndSelect('feedback.user', 'user')
        .leftJoinAndSelect('feedback.event', 'event')
        .orderBy('timestamp', 'DESC');

      if (options.event) {
        query = query.andWhere('event = :event').setParameter('event', options.event);
      }
      if (options.user) {
        query = query.andWhere('"user" = :user').setParameter('user', options.user);
      }
      if (options.type) {
        query = query.andWhere('type = :type').setParameter('type', options.type);
      }
      if (options.status) {
        query = query.andWhere('status = :status').setParameter('status', options.status);
      }

      return query;
    },
  });
