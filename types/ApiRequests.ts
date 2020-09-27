// REQUEST TYPES

// AUTH

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordChange {
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  user: PasswordChange;
}

export interface UserRegistration {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  graduationYear: number;
  major: string;
}

export interface RegistrationRequest {
  user: UserRegistration;
}

// USER

export interface PasswordUpdate extends PasswordChange {
  password: string;
}

export interface UserPatches {
  firstName?: string;
  lastName?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  passwordChange?: PasswordUpdate;
}

export interface PatchUserRequest {
  user: UserPatches;
}

// ADMIN

export interface Milestone {
  name: string;
  points?: number;
}

export interface CreateMilestoneRequest {
  milestone: Milestone;
}

export interface Bonus {
  description: string;
  users: string[]
  points: number;
}

export interface CreateBonusRequest {
  bonus: Bonus;
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
  order: MerchItemOptionAndQuantity[];
}

export interface FulfillMerchOrderRequest {
  items: OrderItemFulfillmentUpdate[];
}

export interface MerchCollection {
  title: string;
  description: string;
  archived?: boolean;
}

export interface MerchCollectionEdit extends Partial<MerchCollection> {
  discountPercentage?: number;
}

export interface CommonMerchItemProperties {
  itemName: string;
  collection: string;
  description: string;
  picture?: string;
  hidden?: boolean;
  metadata?: object;
}

export interface MerchItemOption {
  quantity: number;
  price: number;
  discountPercentage?: number;
}

export interface MerchItem extends CommonMerchItemProperties {
  options: MerchItemOption[];
}

export interface MerchItemOptionEdit extends Partial<MerchItemOption> {
  uuid: string;
}

export interface MerchItemEdit extends Partial<CommonMerchItemProperties> {
  options?: MerchItemOptionEdit[];
}

export interface OrderItemFulfillmentUpdate {
  uuid: string;
  fulfilled?: boolean;
  notes?: string;
}

export interface MerchItemOptionAndQuantity {
  option: string;
  quantity: number;
}
