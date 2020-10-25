import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import * as moment from 'moment';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { PublicFeedback, Feedback, Uuid, ActivityType } from '../types';
import { UserError } from '../utils/Errors';
import { Config } from '../config';

@Service()
export default class FeedbackService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getFeedback(canSeeAllFeedback = false, user: UserModel): Promise<PublicFeedback[]> {
    const feedback = await this.transactions.readOnly(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      if (canSeeAllFeedback) return feedbackRepository.getFeedback();
      return feedbackRepository.getFeedbackByUser(user);
    });
    return feedback.map((fb) => fb.getPublicFeedback());
  }

  public async addFeedback(user: UserModel, feedback: Feedback): Promise<PublicFeedback> {
    const feedbackObject = FeedbackModel.create({ ...feedback, user });
    const addedFeedback = await this.transactions.readWrite(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      const latestFeedback = await feedbackRepository.getLatestFeedback(user);
      if (latestFeedback) {
        const oneWeekAfterFeedback = moment(latestFeedback.timestamp).add(1, 'week');
        if (oneWeekAfterFeedback.valueOf() > moment.now()) {
          const daysLeft = oneWeekAfterFeedback.diff(moment(), 'days', false) + 1;
          throw new UserError(`You must wait ${daysLeft} days to submit more feedback`);
        }
      }
      const fb = await feedbackRepository.upsertFeedback(feedbackObject);
      const pointsEarned = Config.pointReward.FEEDBACK_POINT_REWARD;
      await Repositories.activity(txn).logActivity(user, ActivityType.SUBMIT_FEEDBACK, pointsEarned);
      await Repositories.user(txn).addPoints(user, pointsEarned);
      return fb;
    });
    return addedFeedback.getPublicFeedback();
  }

  public async updateFeedback(uuid: Uuid, changes: Partial<Feedback>) {
    const updatedFeedback = await this.transactions.readWrite(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      const feedback = await feedbackRepository.getOneFeedback(uuid);
      if (!feedback) throw new UserError('Feedback not found');
      return feedbackRepository.upsertFeedback(feedback, changes);
    });
    return updatedFeedback.getPublicFeedback();
  }
}
