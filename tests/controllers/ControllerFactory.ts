import { Connection } from 'typeorm';
import {
  FeedbackService,
  UserAccountService,
  StorageService,
  AttendanceService,
  UserAuthService,
  EmailService,
  EventService,
  MerchStoreService,
  ResumeService,
  UserSocialMediaService,
} from '@services';
import {
  FeedbackController,
  UserController,
  AdminController,
  AttendanceController,
  AuthController,
  EventController,
  LeaderboardController,
  MerchStoreController,
  ResumeController,
} from '@controllers';

export class ControllerFactory {
  public static user(conn: Connection, storageService = new StorageService()): UserController {
    const userAccountService = new UserAccountService(conn.manager);
    const userSocialMediaService = new UserSocialMediaService(conn.manager);
    return new UserController(userAccountService, storageService, userSocialMediaService);
  }

  public static resume(conn: Connection, storageService = new StorageService()): ResumeController {
    const resumeService = new ResumeService(conn.manager);
    return new ResumeController(resumeService, storageService);
  }

  public static feedback(conn: Connection): FeedbackController {
    const feedbackService = new FeedbackService(conn.manager);
    return new FeedbackController(feedbackService);
  }

  public static admin(conn: Connection): AdminController {
    const userAccountService = new UserAccountService(conn.manager);
    const storageService = new StorageService();
    const attendanceService = new AttendanceService(conn.manager);
    return new AdminController(storageService, userAccountService, attendanceService);
  }

  public static attendance(conn: Connection, emailService = new EmailService()): AttendanceController {
    const attendanceService = new AttendanceService(conn.manager);
    return new AttendanceController(attendanceService, emailService);
  }

  public static auth(conn: Connection, emailService: EmailService): AuthController {
    const userAccountService = new UserAccountService(conn.manager);
    const userAuthService = new UserAuthService(conn.manager);
    return new AuthController(userAccountService, userAuthService, emailService);
  }

  public static event(conn: Connection): EventController {
    const eventService = new EventService(conn.manager);
    const storageService = new StorageService();
    const attendanceService = new AttendanceService(conn.manager);
    return new EventController(eventService, storageService, attendanceService);
  }

  public static leaderboard(conn: Connection): LeaderboardController {
    const userAccountService = new UserAccountService(conn.manager);
    return new LeaderboardController(userAccountService);
  }

  public static merchStore(conn: Connection,
    emailService = new EmailService(),
    storageService = new StorageService()): MerchStoreController {
    const merchStoreService = new MerchStoreService(conn.manager, emailService);
    return new MerchStoreController(merchStoreService, storageService);
  }
}
