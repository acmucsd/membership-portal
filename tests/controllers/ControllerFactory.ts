import { DataSource } from 'typeorm';
import ResumeService from '../../services/ResumeService';
import { ResumeController } from '../../api/controllers/ResumeController';
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
import MerchOrderService from '../../services/MerchOrderService';
import UserSocialMediaService from '../../services/UserSocialMediaService';
import { TransactionsManager } from '../../repositories';

export class ControllerFactory {
  public static user(dataSource: DataSource, storageService = new StorageService()): UserController {
    const transactionsManager = new TransactionsManager(dataSource);
    const userAccountService = new UserAccountService(transactionsManager);
    const userSocialMediaService = new UserSocialMediaService(transactionsManager);
    return new UserController(userAccountService, storageService, userSocialMediaService);
  }

  public static feedback(dataSource: DataSource): FeedbackController {
    const transactionsManager = new TransactionsManager(dataSource);
    const feedbackService = new FeedbackService(transactionsManager);
    return new FeedbackController(feedbackService);
  }

  public static admin(dataSource: DataSource): AdminController {
    const transactionsManager = new TransactionsManager(dataSource);
    const userAccountService = new UserAccountService(transactionsManager);
    const storageService = new StorageService();
    const attendanceService = new AttendanceService(transactionsManager);
    return new AdminController(storageService, userAccountService, attendanceService);
  }

  public static attendance(dataSource: DataSource, emailService = new EmailService()): AttendanceController {
    const transactionsManager = new TransactionsManager(dataSource);
    const attendanceService = new AttendanceService(transactionsManager);
    return new AttendanceController(attendanceService, emailService);
  }

  public static auth(dataSource: DataSource, emailService: EmailService): AuthController {
    const transactionsManager = new TransactionsManager(dataSource);
    const userAccountService = new UserAccountService(transactionsManager);
    const userAuthService = new UserAuthService(transactionsManager);
    return new AuthController(userAccountService, userAuthService, emailService);
  }

  public static event(dataSource: DataSource): EventController {
    const transactionsManager = new TransactionsManager(dataSource);
    const eventService = new EventService(transactionsManager);
    const storageService = new StorageService();
    const attendanceService = new AttendanceService(transactionsManager);
    return new EventController(eventService, storageService, attendanceService);
  }

  public static leaderboard(dataSource: DataSource): LeaderboardController {
    const transactionsManager = new TransactionsManager(dataSource);
    const userAccountService = new UserAccountService(transactionsManager);
    return new LeaderboardController(userAccountService);
  }

  public static merchStore(dataSource: DataSource,
    emailService = new EmailService(),
    storageService = new StorageService()): MerchStoreController {
    const transactionsManager = new TransactionsManager(dataSource);
    const merchStoreService = new MerchStoreService(transactionsManager);
    const merchOrderService = new MerchOrderService(transactionsManager, emailService);
    return new MerchStoreController(merchStoreService, merchOrderService, storageService);
  }

  public static resume(dataSource: DataSource,
    storageService = new StorageService()): ResumeController {
    const transactionsManager = new TransactionsManager(dataSource);
    const resumeService = new ResumeService(transactionsManager);
    return new ResumeController(resumeService, storageService);
  }
}
