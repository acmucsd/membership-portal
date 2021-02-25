import { Connection } from 'typeorm';
import FeedbackService from '../../services/FeedbackService';
import { FeedbackController } from '../../api/controllers/FeedbackController';
import { UserController } from '../../api/controllers/UserController';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';

export class ControllerFactory {
  private static userController: UserController = null;

  private static feedbackController: FeedbackController = null;

  public static user(conn: Connection): UserController {
    if (!ControllerFactory.userController) {
      const userService = new UserAccountService(conn.manager);
      const storageService = new StorageService();
      ControllerFactory.userController = new UserController(userService, storageService);
    }
    return ControllerFactory.userController;
  }

  public static feedback(conn: Connection): FeedbackController {
    if (!ControllerFactory.feedbackController) {
      const feedbackService = new FeedbackService(conn.manager);
      ControllerFactory.feedbackController = new FeedbackController(feedbackService);
    }
    return ControllerFactory.feedbackController;
  }
}
