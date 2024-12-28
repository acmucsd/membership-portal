import { Service } from 'typedi';
import { NotFoundError } from 'routing-controllers';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager, FeedbackRepository } from '../repositories';
import { PublicFeedback, Feedback, Uuid, ActivityType, FeedbackStatus, FeedbackSearchOptions } from '../types';
import { UserError } from '../utils/Errors';

@Service()
export default class FeedbackService {
  private transactions: TransactionsManager;

  constructor(transactionsManager: TransactionsManager) {
    this.transactions = transactionsManager;
  }

  public async getFeedback(canSeeAllFeedback = false, user: UserModel,
    options: FeedbackSearchOptions): Promise<PublicFeedback[]> {
    return this.transactions.readOnly(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      if (canSeeAllFeedback) {
        return (await feedbackRepository.getAllFeedback(options))
          .map((fb) => fb.getPublicFeedback());
      }

      const userFeedback = await feedbackRepository.getStandardUserFeedback(user, options);
      return userFeedback.map((fb) => fb.getPublicFeedback());
    });
  }

  public async submitFeedback(user: UserModel, feedback: Feedback): Promise<PublicFeedback> {
    return this.transactions.readWrite(async (txn) => {
      const event = await Repositories.event(txn).findByUuid(feedback.event);
      if (!event) throw new NotFoundError('Event not found!');

      const feedbackRepository = Repositories.feedback(txn);

      const hasAlreadySubmittedFeedback = await feedbackRepository.hasUserSubmittedFeedback(user, event);
      if (hasAlreadySubmittedFeedback) throw new UserError('You have already submitted feedback for this event!');

      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.SUBMIT_FEEDBACK,
      });
      const addedFeedback = await feedbackRepository.upsertFeedback(
        FeedbackRepository.create({ ...feedback, user, event }),
      );
      return addedFeedback.getPublicFeedback();
    });
  }

  public async updateFeedbackStatus(uuid: Uuid, status: FeedbackStatus) {
    return this.transactions.readWrite(async (txn) => {
      const feedbackRepository = Repositories.feedback(txn);
      const feedback = await feedbackRepository.findByUuid(uuid);
      if (!feedback) throw new NotFoundError('Feedback not found');
      if (feedback.status !== FeedbackStatus.SUBMITTED) {
        throw new UserError('This feedback has already been responded to');
      }

      const { user } = feedback;
      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.FEEDBACK_ACKNOWLEDGED,
      });
      const updatedFeedback = await feedbackRepository.upsertFeedback(feedback, { status });
      return updatedFeedback.getPublicFeedback();
    });
  }
}
