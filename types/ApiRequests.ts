// REQUEST TYPES

// AUTH

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  user: PasswordChange;
}

export interface RegistrationRequest {
  user: UserRegistration;
}

// USER

export interface PatchUserRequest {
  user: UserPatches;
}

// ADMIN

export interface CreateMilestoneRequest {
  milestone: Milestone;
}

export interface CreateBonusRequest {
  bonus: Bonus;
}

// EVENT

export interface CreateEventRequest {
  event: Event;
}

export interface PatchEventRequest {
  event: Partial<Event>;
}

export interface AttendEventRequest {
  attendanceCode: string;
  asStaff?: boolean;
}

// MERCH STORE

export interface CreateMerchCollectionRequest {
  collection: MerchCollection;
}

export interface EditMerchCollectionRequest {
  collection: MerchCollectionEdit;
}

export interface CreateMerchItemRequest {
  merchandise: MerchItem;
}

export interface EditMerchItemRequest {
  merchandise: MerchItemEdit;
}

export interface PlaceMerchOrderRequest {
  order: MerchItemAndQuantity[];
}

export interface FulfillMerchOrderRequest {
  items: OrderItemFulfillmentUpdate[];
}

// RAW TYPES

export interface UserRegistration {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  graduationYear: number;
  major: string;
}

export interface UserPatches {
  firstName?: string;
  lastName?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  passwordChange?: PasswordUpdate;
}

export interface PasswordChange {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordUpdate extends PasswordChange {
  password: string;
}

export interface Milestone {
  name: string;
  points?: number;
}

export interface Bonus {
  description: string;
  users: string[]
  points: number;
}

export interface Event extends OptionalEventProperties {
  cover: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  attendanceCode: string;
  pointValue: number;
}

export interface OptionalEventProperties {
  organization?: string;
  committee?: string;
  thumbnail?: string;
  eventLink?: string;
  requiresStaff?: boolean;
  staffPointBonus?: number;
}

export interface MerchCollection {
  title: string;
  description: string;
  archived?: boolean;
}

export interface MerchCollectionEdit extends Partial<MerchCollection> {
  discountPercentage?: number;
}

export interface MerchItem {
  itemName: string;
  collection: string;
  price: number;
  description: string;
  picture?: string;
  quantity?: number;
  discountPercentage?: number;
  hidden?: boolean;
  metadata?: object;
}

export interface MerchItemEdit extends Partial<MerchItem> {}

export interface OrderItemFulfillmentUpdate {
  uuid: string;
  fulfilled?: boolean;
  notes?: string;
}

export interface MerchItemAndQuantity {
  item: string;
  quantity: number;
}
