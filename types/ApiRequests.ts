import {
  PasswordChange,
  PasswordUpdate,
  MerchItemAndQuantity,
  OrderItemFulfillmentUpdate,
  OptionalEventProperties,
} from '.';

// AUTH

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  user: PasswordChange;
}

export interface RegistrationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  graduationYear: number;
  major: string;
}

// USER

export interface PatchUserRequest {
  firstName?: string;
  lastName?: string;
  major?: string;
  graduationYear?: number;
  bio?: string;
  passwordChange?: PasswordUpdate;
}

// ADMIN

export interface CreateMilestoneRequest {
  name: string;
  points?: number;
}

export interface CreateBonusRequest {
  description: string;
  users: string[]
  points: number;
}

// EVENT

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

// ATTENDANCE

export interface AttendEventRequest {
  attendanceCode: string;
  asStaff?: boolean;
}

// MERCH STORE

export interface CreateMerchCollectionRequest {
  title: string;
  description: string;
  archived?: boolean;
}

export interface EditMerchCollectionRequest extends Partial<CreateMerchCollectionRequest> {
  discountPercentage?: number;
}

export interface CreateMerchItemRequest {
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

export interface EditMerchItemRequest extends Partial<CreateMerchItemRequest> {}

export interface PlaceOrderRequest {
  order: MerchItemAndQuantity[];
}

export interface FulfillMerchOrderRequest {
  items: OrderItemFulfillmentUpdate[];
}
