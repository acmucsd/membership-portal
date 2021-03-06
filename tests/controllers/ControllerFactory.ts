import { Connection } from 'typeorm';
import FeedbackService from '../../services/FeedbackService';
import { FeedbackController } from '../../api/controllers/FeedbackController';
import { UserController } from '../../api/controllers/UserController';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import { AdminController } from '../../api/controllers/AdminController';
import AttendanceService from '../../services/AttendanceService';
import { AttendanceController } from '../../api/controllers/AttendanceController';
import { AuthController } from '../../api/controllers/AuthController';
import { EventController } from '../../api/controllers/EventController';
import { LeaderboardController } from '../../api/controllers/LeaderboardController';
import { MerchStoreController } from '../../api/controllers/MerchStoreController';
import UserAuthService from '../../services/UserAuthService';
import EmailService from '../../services/EmailService';
import EventService from '../../services/EventService';
import MerchStoreService from '../../services/MerchStoreService';

export class ControllerFactory {
  private static userController: UserController = null;
  private static feedbackController: FeedbackController = null;
  private static adminController: AdminController = null;
  private static attendanceController: AttendanceController = null;
  private static authController: AuthController = null;
  private static eventController: EventController = null;
  private static leaderboardController: LeaderboardController = null;
  private static merchStoreController: MerchStoreController = null;

  public static user(conn: Connection): UserController {
    if (!ControllerFactory.userController) {
      const userAccountService = new UserAccountService(conn.manager);
      const storageService = new StorageService();
      ControllerFactory.userController = new UserController(userAccountService, storageService);
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

  public static admin(conn: Connection): AdminController {
    if(!ControllerFactory.adminController) {
      const userAccountService = new UserAccountService(conn.manager);
      const storageService = new StorageService();
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.adminController = new AdminController(storageService, userAccountService, attendanceService);
    }
    return ControllerFactory.adminController;
  }

  public static attendance(conn: Connection): AttendanceController {
    if(!ControllerFactory.attendanceController) {
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.attendanceController = new AttendanceController(attendanceService);
    }
    return ControllerFactory.attendanceController;
  }

  public static auth(conn: Connection): AuthController {
    if(!ControllerFactory.authController) {
      const userAccountService = new UserAccountService(conn.manager);
      const userAuthService = new UserAuthService(conn.manager);
      const emailService = new EmailService();
      ControllerFactory.authController = new AuthController(userAccountService, userAuthService, emailService);
    }
    return ControllerFactory.authController;
  }

  public static event(conn: Connection): EventController {
    if(!ControllerFactory.eventController) {
      const eventService = new EventService(conn.manager);
      const storageService = new StorageService();
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.eventController = new EventController(eventService, storageService, attendanceService);
    }
    return ControllerFactory.eventController;
  }

  public static leaderboard(conn: Connection): LeaderboardController {
    if(!ControllerFactory.leaderboardController) {
      const userAccountService = new UserAccountService(conn.manager);
      ControllerFactory.leaderboardController = new LeaderboardController(userAccountService);
    }
    return ControllerFactory.leaderboardController;
  }

  public static merchStore(conn: Connection): MerchStoreController {
    if(!ControllerFactory.merchStoreController) {
      const merchStoreService = new MerchStoreService(conn.manager);
      ControllerFactory.merchStoreController = new MerchStoreController(merchStoreService);
    }
    return ControllerFactory.merchStoreController;
  }
}
