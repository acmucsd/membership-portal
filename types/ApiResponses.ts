import { ActivityType } from './Enums';

// REQUEST TYPES

export interface CustomErrorResponse {
  error: {
    name: string;
    message: string;
    status: number;
    stack?: string;
    errors?: any;
  }
}

export interface APIResponse {
  error: CustomErrorResponse;
}

// ADMIN

export interface CreateMilestoneResponse extends APIResponse {}

export interface CreateBonusResponse extends APIResponse {
  emails: string[];
}

export interface UploadBannerResponse extends APIResponse {
  banner: string;
}

// ATTENDANCE

export interface GetAttendancesForEventResponse extends APIResponse {
  attendances: PublicAttendance[];
}

export interface GetAttendancesForUserResponse extends APIResponse {
  attendances: PublicAttendance[];
}

export interface AttendEventResponse extends APIResponse {}

// AUTH

export interface RegistrationResponse extends APIResponse {
  user: PrivateProfile;
}

export interface LoginResponse extends APIResponse {
  token: string;
}

export interface ResendEmailVerificationResponse extends APIResponse {}

export interface VerifyEmailResponse extends APIResponse {}

export interface SendPasswordResetEmailResponse extends APIResponse {}

export interface ResetPasswordResponse extends APIResponse {}

export interface VerifyAuthTokenResponse extends APIResponse {
  authenticated: boolean;
}

// EVENT

export interface GetPastEventsResponse extends APIResponse {
  events: PublicEvent[];
}

export interface GetFutureEventsResponse extends APIResponse {
  events: PublicEvent[];
}

export interface UpdateEventCoverResponse extends APIResponse {
  event: PublicEvent;
}

export interface GetOneEventResponse extends APIResponse {
  event: PublicEvent;
}

export interface PatchEventResponse extends APIResponse {
  event: PublicEvent;
}

export interface DeleteEventResponse extends APIResponse {}

export interface GetAllEventsResponse extends APIResponse {
  events: PublicEvent[];
}

export interface CreateEventResponse extends APIResponse {
  event: PublicEvent;
}

// LEADERBOARD

export interface GetLeaderboardResponse extends APIResponse {
  leaderboard: PublicProfile[];
}

// MERCH STORE

export interface GetOneMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

export interface GetAllMerchCollectionsResponse extends APIResponse {
  collections: PublicMerchCollection[];
}

export interface CreateMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

export interface EditMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

export interface DeleteMerchCollectionResponse extends APIResponse {}

export interface GetOneMerchItemResponse extends APIResponse {
  item: PublicMerchItem;
}

export interface CreateMerchItemResponse extends APIResponse {
  item: PublicMerchItem;
}

export interface EditMerchItemResponse extends APIResponse {
  item: PublicMerchItem;
}

export interface DeleteMerchItemResponse extends APIResponse {}

export interface GetOneMerchOrderResponse extends APIResponse {
  order: PublicOrder;
}

export interface GetAllMerchOrdersResponse extends APIResponse {
  orders: PublicOrder[];
}

export interface PlaceMerchOrderResponse extends APIResponse {
  order: PublicOrder;
}

export interface EditMerchOrderResponse extends APIResponse {}

// USER

export interface GetUserActivityStreamResponse extends APIResponse {
  activity: PublicActivity[];
}

export interface UpdateProfilePictureResponse extends APIResponse {
  user: PrivateProfile;
}

export interface GetUserResponse extends APIResponse {
  user: PrivateProfile | PublicProfile;
}

export interface GetCurrentUserResponse extends APIResponse {
  user: PrivateProfile;
}

export interface PatchUserResponse extends APIResponse {
  user: PrivateProfile;
}

// RAW TYPES

export type Uuid = string;

export interface PublicAttendance {
  user: PublicProfile;
  event: PublicEvent;
  timestamp: Date;
  asStaff: boolean;
}

export interface PublicEvent {
  uuid: Uuid;
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
  uuid: Uuid,
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
  collection?: PublicMerchCollection;
  picture: string;
  description: string;
  monthlyLimit: number;
  lifetimeLimit: number;
  options: PublicMerchItemOption[];
}

export interface PublicMerchItemOption {
  uuid: Uuid;
  price: number;
  discountPercentage: number;
  metadata: object;
}

export interface PublicOrderItem {
  uuid: Uuid;
  option: PublicMerchItemOption;
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
