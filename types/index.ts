import { ActivityType } from './Enums';

export * from './Enums';
export * from './ApiRequests';

export type Uuid = string;
export type File = Express.Multer.File;

export interface PublicAttendance {
  user: PublicProfile;
  event: PublicEvent;
  timestamp: Date;
  asStaff: boolean;
}

export interface PublicEvent {
  uuid: string;
  organization: string;
  committee: string;
  thumbnail: string;
  cover: string;
  title: string;
  description: string;
  location: string;
  eventLink: string;
  start: Date;
  end: Date;
  attendanceCode?: string;
  pointValue: number;
  requiresStaff: boolean;
  staffPointBonus: number;
}

export interface PublicProfile {
  firstName: string,
  lastName: string,
  profilePicture: string,
  graduationYear: number,
  major: string,
  bio: string,
  points: number,
}

export interface PrivateProfile extends PublicProfile {
  email: string,
  accessType: string,
  state: string,
  credits: number,
}

export interface PublicActivity {
  type: ActivityType,
  description: string,
  pointsEarned: number,
  timestamp: Date;
}

export interface PublicMerchCollection {
  uuid: Uuid;
  title: string;
  description: string;
  items: PublicMerchItem[];
}

export interface PublicMerchItem {
  uuid: Uuid;
  itemName: string;
  collection: PublicMerchCollection;
  picture: string;
  price: number;
  description: string;
  discountPercentage: number;
  monthlyLimit: number;
  lifetimeLimit: number;
}

export interface PublicOrderItem {
  uuid: Uuid;
  item: PublicMerchItem;
  salePriceAtPurchase: number;
  discountPercentageAtPurchase: number;
  fulfilled: boolean;
  fulfilledAt?: Date;
  notes?: string;
}

export interface PublicOrder {
  uuid: Uuid;
  user: Uuid;
  totalCost: number;
  orderedAt: Date;
  items: PublicOrderItem[];
}

// AUTH

export interface PasswordChange {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordUpdate extends PasswordChange {
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  user: PasswordChange;
}

// USER

export interface RegistrationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  graduationYear: number;
  major: string;
}

export interface PatchUserRequest {
  firstName?: string;
  lastName?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  passwordChange?: PasswordUpdate;
}

export interface UserEmails {
  emails: string[];
}

// EVENT

export interface OptionalEventProperties {
  organization?: string;
  committee?: string;
  thumbnail?: string;
  eventLink?: string;
  requiresStaff?: boolean;
  staffPointBonus?: number;
}

export interface PostEventRequest extends OptionalEventProperties {
  cover: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  attendanceCode: string;
  pointValue: number;
}

export interface PatchEventRequest extends Partial<PostEventRequest> {}

export interface EventSearchOptions {
  offset?: number;
  limit?: number;
}

// ATTENDANCE

export interface AttendEventRequest {
  attendanceCode: string;
  asStaff?: boolean;
}

// ERROR

export interface CustomError {
  error: {
    name: string;
    message: string;
    status: number;
    stack?: string;
  }
}
