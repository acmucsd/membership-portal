 
import { UserModel } from '../../models/UserModel';
import { UserController } from './UserController';
import { AuthController } from './AuthController';
import { EventController } from './EventController';
import { AttendanceController } from './AttendanceController';
import { AdminController } from './AdminController';
import { MerchStoreController } from './MerchStoreController';
import { LeaderboardController } from './LeaderboardController';
import { FeedbackController } from './FeedbackController';
import { ResumeController } from './ResumeController';

export const controllers = [
  AuthController,
  UserController,
  ResumeController,
  EventController,
  AttendanceController,
  LeaderboardController,
  AdminController,
  MerchStoreController,
  FeedbackController,
  ResumeController,
];

// this merges our custom properties into Express's Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserModel;
      trace?: string;
    }
  }
}
