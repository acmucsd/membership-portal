import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { FeedbackModel } from '../models/FeedbackModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { PublicFeedback, Feedback, Uuid, ActivityType, FeedbackStatus, FeedbackSearchOptions } from '../types';
import { UserError } from '../utils/Errors';
import { Config } from '../config';

@Service()
export default class FeedbackService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getFeedback(canSeeAllFeedback = false, user: UserModel,
    options: FeedbackSearchOptions): Promise<PublicFeedback[]> {
    const feedback = await this.transactions.readOnly(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      if (canSeeAllFeedback) return feedbackRepository.getAllFeedback(options);
      return feedbackRepository.getAllFeedbackForUser(user);
    });
    return feedback.map((fb) => fb.getPublicFeedback());
  }

  public async submitFeedback(user: UserModel, feedback: Feedback): Promise<PublicFeedback> {
    const addedFeedback = await this.transactions.readWrite(async (txn) => {
      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.SUBMIT_FEEDBACK,
      });
      return Repositories.feedback(txn).upsertFeedback(FeedbackModel.create({ ...feedback, user }));
    });
    return addedFeedback.getPublicFeedback();
  }

  public async updateFeedbackStatus(uuid: Uuid, status: FeedbackStatus) {
    const acknowledgedFeedback = await this.transactions.readWrite(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      const feedback = await feedbackRepository.findByUuid(uuid);
      if (!feedback) throw new NotFoundError('Feedback not found');
      if (feedback.status !== FeedbackStatus.SUBMITTED) {
        throw new UserError('This feedback has already been responded to');
      }

      const { user } = feedback;
      if (status === FeedbackStatus.ACKNOWLEDGED) {
        const pointsEarned = Config.pointReward.FEEDBACK_POINT_REWARD;
        await Repositories.activity(txn).logActivity({
          user,
          type: ActivityType.FEEDBACK_ACKNOWLEDGED,
          pointsEarned,
        });
        await Repositories.user(txn).addPoints(user, pointsEarned);
      }

      return feedbackRepository.upsertFeedback(feedback, { status });
    });
    return acknowledgedFeedback.getPublicFeedback();
  }
}
