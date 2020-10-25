import { EntityRepository } from 'typeorm';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';
import { Uuid } from '../types';

@EntityRepository(FeedbackModel)
export class FeedbackRepository extends BaseRepository<FeedbackModel> {
  public async getFeedback(): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery().getMany();
  }

  public async getOneFeedback(uuid: Uuid): Promise<FeedbackModel> {
    return this.getBaseFindQuery().where({ uuid }).getOne();
  }

  public async getLatestFeedback(user: UserModel): Promise<FeedbackModel> {
    return this.getBaseFindQuery()
      .where({ user })
      .orderBy('timestamp', 'DESC')
      .getOne();
  }

  public async getFeedbackByUser(user: UserModel): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery().where({ user }).getMany();
  }

  public async upsertFeedback(feedback: FeedbackModel,
    changes?: Partial<FeedbackModel>): Promise<FeedbackModel> {
    if (changes) FeedbackModel.merge(feedback, changes);
    return this.repository.save(feedback);
  }

  private getBaseFindQuery() {
    return this.repository.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user');
  }
}
