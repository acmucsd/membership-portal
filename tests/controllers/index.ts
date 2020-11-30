import { Connection } from 'typeorm';
import FeedbackService from '../../services/FeedbackService';
import { FeedbackController } from '../../api/controllers/FeedbackController';

export class ControllerFactory {
  private static feedbackController: FeedbackController = null;

  public static feedback(conn: Connection): FeedbackController {
    if (!ControllerFactory.feedbackController) {
      const feedbackService = new FeedbackService(conn.manager);
      ControllerFactory.feedbackController = new FeedbackController(feedbackService);
    }
    return ControllerFactory.feedbackController;
  }
}
