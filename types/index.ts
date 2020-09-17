import { ActivityType } from './Enums';

export * from './Enums';
export * from './ApiRequests';
export * from './ApiResponses';

export type Uuid = string;
export type File = Express.Multer.File;

// AUTH

export interface PasswordChange {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordUpdate extends PasswordChange {
  password: string;
}

// ATTENDANCE

export interface PublicAttendance {
  user: PublicProfile;
  event: PublicEvent;
  timestamp: Date;
  asStaff: boolean;
}

// EVENT

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

export interface EventSearchOptions {
  offset?: number;
  limit?: number;
}

export interface OptionalEventProperties {
  organization?: string;
  committee?: string;
  thumbnail?: string;
  eventLink?: string;
  requiresStaff?: boolean;
  staffPointBonus?: number;
}

// USER

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

// MERCH STORE

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

export interface OrderItemFulfillmentUpdate {
  uuid: string;
  fulfilled?: boolean;
  notes?: string;
}

export interface MerchItemAndQuantity {
  item: string;
  quantity: number;
}
