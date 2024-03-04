import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';
import { FeedbackSearchOptions, Uuid } from '../types';

@EntityRepository(FeedbackModel)
export class FeedbackRepository extends BaseRepository<FeedbackModel> {
  public async getAllFeedback(options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery(options).getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<FeedbackModel> {
    return this.getBaseFindQuery({}).where({ uuid }).getOne();
  }

  public async getAllFeedbackForUser(user: UserModel): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery({}).where({ user }).getMany();
  }

  public async upsertFeedback(feedback: FeedbackModel,
    changes?: Partial<FeedbackModel>): Promise<FeedbackModel> {
    if (changes) feedback = FeedbackModel.merge(feedback, changes);
    return this.repository.save(feedback);
  }

  private getBaseFindQuery(options: FeedbackSearchOptions): SelectQueryBuilder<FeedbackModel> {
    let query = this.repository.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .leftJoinAndSelect('feedback.event', 'event')
      .orderBy('timestamp', 'DESC');

    if (options.event) {
      query = query.andWhere('event = :event').setParameter('event', options.event);
    }
    if (options.type) {
      query = query.andWhere('type = :type').setParameter('type', options.type);
    }
    if (options.status) {
      query = query.andWhere('status = :status').setParameter('status', options.status);
    }

    return query;
  }
}
