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
  public static user(
    conn: Connection,
    userAccountService = new UserAccountService(conn.manager),
    storageService = new StorageService(),
  ): UserController {
    return new UserController(userAccountService, storageService);
  }

  public static feedback(
    conn: Connection,
    feedbackService = new FeedbackService(conn.manager),
  ): FeedbackController {
    return new FeedbackController(feedbackService);
  }

  public static admin(
    conn: Connection,
    storageService = new StorageService(),
    userAccountService = new UserAccountService(conn.manager),
    attendanceService = new AttendanceService(conn.manager),
  ): AdminController {
    return new AdminController(storageService, userAccountService, attendanceService);
  }

  public static attendance(
    conn: Connection,
    attendanceService = new AttendanceService(conn.manager),
  ): AttendanceController {
    return new AttendanceController(attendanceService);
  }

  public static auth(
    conn: Connection,
    userAccountService = new UserAccountService(conn.manager),
    userAuthService = new UserAuthService(conn.manager),
    emailService = new EmailService(),
  ): AuthController {
    return new AuthController(userAccountService, userAuthService, emailService);
  }

  public static event(
    conn: Connection,
    eventService = new EventService(conn.manager),
    storageService = new StorageService(),
    attendanceService = new AttendanceService(conn.manager),
  ): EventController {
    return new EventController(eventService, storageService, attendanceService);
  }

  public static leaderboard(conn: Connection,
    userAccountService = new UserAccountService(conn.manager)): LeaderboardController {
    return new LeaderboardController(userAccountService);
  }

  public static merchStore(conn: Connection,
    merchStoreService = new MerchStoreService(conn.manager)): MerchStoreController {
    return new MerchStoreController(merchStoreService);
  }
}
