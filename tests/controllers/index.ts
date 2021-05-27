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

  // Allow services to be dependency injected for mocking/stubbing
  public static user(
    conn: Connection,
    userAccountService?: UserAccountService,
    storageService?: StorageService,
  ): UserController {
    const hasInjectedService = userAccountService || storageService;
    if (!ControllerFactory.userController || hasInjectedService) {
      ControllerFactory.userController = new UserController(
        userAccountService || new UserAccountService(conn.manager),
        storageService || new StorageService(),
      );
    }
    return ControllerFactory.userController;
  }

  public static feedback(
    conn: Connection,
    feedbackService?: FeedbackService,
  ): FeedbackController {
    const hasInjectedService = !!feedbackService;
    if (!ControllerFactory.feedbackController || hasInjectedService) {
      ControllerFactory.feedbackController = new FeedbackController(
        feedbackService || new FeedbackService(conn.manager),
      );
    }
    return ControllerFactory.feedbackController;
  }

  public static admin(
    conn: Connection,
    storageService?: StorageService,
    userAccountService?: UserAccountService,
    attendanceService?: AttendanceService,
  ): AdminController {
    const hasInjectedService = storageService || userAccountService || attendanceService;
    if (!ControllerFactory.adminController || hasInjectedService) {
      ControllerFactory.adminController = new AdminController(
        storageService || new StorageService(),
        userAccountService || new UserAccountService(conn.manager),
        attendanceService || new AttendanceService(conn.manager),
      );
    }
    return ControllerFactory.adminController;
  }

  public static attendance(
    conn: Connection,
    attendanceService?: AttendanceService,
  ): AttendanceController {
    const hasInjectedService = !!attendanceService;
    if (!ControllerFactory.attendanceController || hasInjectedService) {
      ControllerFactory.attendanceController = new AttendanceController(
        attendanceService || new AttendanceService(conn.manager),
      );
    }
    return ControllerFactory.attendanceController;
  }

  public static auth(
    conn: Connection,
    userAccountService?: UserAccountService,
    userAuthService?: UserAuthService,
    emailService?: EmailService,
  ): AuthController {
    const hasInjectedService = userAccountService || userAuthService || emailService;
    if (!ControllerFactory.authController || hasInjectedService) {
      ControllerFactory.authController = new AuthController(
        userAccountService || new UserAccountService(conn.manager),
        userAuthService || new UserAuthService(conn.manager),
        emailService || new EmailService(),
      );
    }
    return ControllerFactory.authController;
  }

  public static event(
    conn: Connection,
    eventService?: EventService,
    storageService?: StorageService,
    attendanceService?: AttendanceService,
  ): EventController {
    const hasInjectedService = eventService || storageService || attendanceService;
    if (!ControllerFactory.eventController || hasInjectedService) {
      ControllerFactory.eventController = new EventController(
        eventService || new EventService(conn.manager),
        storageService || new StorageService(),
        attendanceService || new AttendanceService(conn.manager),
      );
    }
    return ControllerFactory.eventController;
  }

  public static leaderboard(conn: Connection, userAccountService?: UserAccountService): LeaderboardController {
    const hasInjectedService = !!userAccountService;
    if (!ControllerFactory.leaderboardController || hasInjectedService) {
      ControllerFactory.leaderboardController = new LeaderboardController(
        userAccountService || new UserAccountService(conn.manager),
      );
    }
    return ControllerFactory.leaderboardController;
  }

  public static merchStore(conn: Connection, merchStoreService?: MerchStoreService): MerchStoreController {
    const hasInjectedService = !!merchStoreService;
    if (!ControllerFactory.merchStoreController || hasInjectedService) {
      ControllerFactory.merchStoreController = new MerchStoreController(
        merchStoreService || new MerchStoreService(conn.manager),
      );
    }
    return ControllerFactory.merchStoreController;
  }
}
