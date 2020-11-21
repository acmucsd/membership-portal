import { EntityRepository } from 'typeorm';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';
import { Uuid } from '../types';

@EntityRepository(FeedbackModel)
export class FeedbackRepository extends BaseRepository<FeedbackModel> {
  public async getAllFeedback(): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery().getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<FeedbackModel> {
    return this.getBaseFindQuery().where({ uuid }).getOne();
  }

  public async getAllFeedbackForUser(user: UserModel): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery().where({ user }).getMany();
  }

  public async upsertFeedback(feedback: FeedbackModel,
    changes?: Partial<FeedbackModel>): Promise<FeedbackModel> {
    if (changes) feedback = FeedbackModel.merge(feedback, changes);
    return this.repository.save(feedback);
  }

  private getBaseFindQuery() {
    return this.repository.createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.user', 'user')
      .orderBy('timestamp', 'DESC');
  }
}
