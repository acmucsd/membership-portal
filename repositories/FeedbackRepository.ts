import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { FeedbackSearchOptions, Uuid } from '@customtypes';
import { FeedbackModel, UserModel, EventModel } from '@models';
import { BaseRepository } from '@repositories';

@EntityRepository(FeedbackModel)
export class FeedbackRepository extends BaseRepository<FeedbackModel> {
  public async getAllFeedback(options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery(options).getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<FeedbackModel> {
    return this.getBaseFindQuery({}).where({ uuid }).getOne();
  }

  // temporary fix for getting feedback for a user for an event
  public async getStandardUserFeedback(user: UserModel, options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
    let query = this.getBaseFindQuery(options);
    query = query.andWhere('feedback.user = :user', { user: user.uuid });

    return query.getMany();
  }

  public async getAllFeedbackForUser(user: UserModel, options: FeedbackSearchOptions): Promise<FeedbackModel[]> {
    return this.getBaseFindQuery(options).where({ user }).getMany();
  }

  public async upsertFeedback(feedback: FeedbackModel,
    changes?: Partial<FeedbackModel>): Promise<FeedbackModel> {
    if (changes) feedback = FeedbackModel.merge(feedback, changes);
    return this.repository.save(feedback);
  }

  public async hasUserSubmittedFeedback(user: UserModel, event: EventModel): Promise<boolean> {
    const count = await this.repository.count({
      where: { user, event },
    });
    return count > 0;
  }

  private getBaseFindQuery(options: FeedbackSearchOptions): SelectQueryBuilder<FeedbackModel> {
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
  }
}
