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
import { ResumeController } from '../../api/controllers/ResumeController';
import ResumeService from '../../services/ResumeService';
import UserSocialMediaService from '../../services/UserSocialMediaService';

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
