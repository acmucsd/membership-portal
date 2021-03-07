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
import { DatabaseConnection } from '../data';

export class ControllerFactory {
  private static userController: UserController = null;

  private static feedbackController: FeedbackController = null;

  private static adminController: AdminController = null;

  private static attendanceController: AttendanceController = null;

  private static authController: AuthController = null;

  private static eventController: EventController = null;

  private static leaderboardController: LeaderboardController = null;

  private static merchStoreController: MerchStoreController = null;

  public static async user(): Promise<UserController> {
    if (!ControllerFactory.userController) {
      const conn = await DatabaseConnection.get();
      const userAccountService = new UserAccountService(conn.manager);
      const storageService = new StorageService();
      ControllerFactory.userController = new UserController(userAccountService, storageService);
    }
    return ControllerFactory.userController;
  }

  public static async feedback(): Promise<FeedbackController> {
    if (!ControllerFactory.feedbackController) {
      const conn = await DatabaseConnection.get();
      const feedbackService = new FeedbackService(conn.manager);
      ControllerFactory.feedbackController = new FeedbackController(feedbackService);
    }
    return ControllerFactory.feedbackController;
  }

  public static async admin(): Promise<AdminController> {
    if (!ControllerFactory.adminController) {
      const conn = await DatabaseConnection.get();
      const userAccountService = new UserAccountService(conn.manager);
      const storageService = new StorageService();
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.adminController = new AdminController(storageService, userAccountService, attendanceService);
    }
    return ControllerFactory.adminController;
  }

  public static async attendance(): Promise<AttendanceController> {
    if (!ControllerFactory.attendanceController) {
      const conn = await DatabaseConnection.get();
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.attendanceController = new AttendanceController(attendanceService);
    }
    return ControllerFactory.attendanceController;
  }

  public static async auth(): Promise<AuthController> {
    if (!ControllerFactory.authController) {
      const conn = await DatabaseConnection.get();
      const userAccountService = new UserAccountService(conn.manager);
      const userAuthService = new UserAuthService(conn.manager);
      const emailService = new EmailService();
      ControllerFactory.authController = new AuthController(userAccountService, userAuthService, emailService);
    }
    return ControllerFactory.authController;
  }

  public static async event(): Promise<EventController> {
    if (!ControllerFactory.eventController) {
      const conn = await DatabaseConnection.get();
      const eventService = new EventService(conn.manager);
      const storageService = new StorageService();
      const attendanceService = new AttendanceService(conn.manager);
      ControllerFactory.eventController = new EventController(eventService, storageService, attendanceService);
    }
    return ControllerFactory.eventController;
  }

  public static async leaderboard(): Promise<LeaderboardController> {
    if (!ControllerFactory.leaderboardController) {
      const conn = await DatabaseConnection.get();
      const userAccountService = new UserAccountService(conn.manager);
      ControllerFactory.leaderboardController = new LeaderboardController(userAccountService);
    }
    return ControllerFactory.leaderboardController;
  }

  public static async merchStore(): Promise<MerchStoreController> {
    if (!ControllerFactory.merchStoreController) {
      const conn = await DatabaseConnection.get();
      const merchStoreService = new MerchStoreService(conn.manager);
      ControllerFactory.merchStoreController = new MerchStoreController(merchStoreService);
    }
    return ControllerFactory.merchStoreController;
  }
}
