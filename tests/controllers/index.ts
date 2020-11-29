import Container from 'typedi';
import FeedbackService from '../../services/FeedbackService';
import { FeedbackController } from '../../api/controllers/FeedbackController';

export class ControllerFactory {
  private static feedbackController: FeedbackController = null;

  public static feedback(): FeedbackController {
    if (!ControllerFactory.feedbackController) {
      const feedbackService = Container.get(FeedbackService);
      ControllerFactory.feedbackController = new FeedbackController(feedbackService);
    }
    return ControllerFactory.feedbackController;
  }
}
