import { ActivityScope, ActivityType, FeedbackStatus, FeedbackType } from './Enums';
import { Uuid } from '.';

// RESPONSE TYPES

export interface CustomErrorBody {
  name: string;
  message: string;
  httpCode: number;
  stack?: string;
  errors?: any;
}

export interface ApiResponse {
  error: CustomErrorBody;
}

// ADMIN

export interface CreateMilestoneResponse extends ApiResponse {}

export interface CreateBonusResponse extends ApiResponse {
  emails: string[];
}

export interface UploadBannerResponse extends ApiResponse {
  banner: string;
}

export interface GetAllEmailsResponse extends ApiResponse {
  emails: string[];
}

export interface SubmitAttendanceForUsersResponse extends ApiResponse {
  attendances: PublicAttendance[];
}

// ATTENDANCE

export interface PublicAttendance {
  user: PublicProfile;
  event: PublicEvent;
  timestamp: Date;
  asStaff: boolean;
  feedback: string[];
}

export interface GetAttendancesForEventResponse extends ApiResponse {
  attendances: PublicAttendance[];
}

export interface GetAttendancesForUserResponse extends ApiResponse {
  attendances: PublicAttendance[];
}

export interface AttendEventResponse extends ApiResponse {
  event: PublicEvent;
}

// AUTH

export interface RegistrationResponse extends ApiResponse {
  user: PrivateProfile;
}

export interface LoginResponse extends ApiResponse {
  token: string;
}

export interface ResendEmailVerificationResponse extends ApiResponse {}

export interface VerifyEmailResponse extends ApiResponse {}

export interface SendPasswordResetEmailResponse extends ApiResponse {}

export interface ResetPasswordResponse extends ApiResponse {}

export interface VerifyAuthTokenResponse extends ApiResponse {
  authenticated: boolean;
}

// EVENT

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

export interface GetPastEventsResponse extends ApiResponse {
  events: PublicEvent[];
}

export interface GetFutureEventsResponse extends ApiResponse {
  events: PublicEvent[];
}

export interface UpdateEventCoverResponse extends ApiResponse {
  event: PublicEvent;
}

export interface GetOneEventResponse extends ApiResponse {
  event: PublicEvent;
}

export interface PatchEventResponse extends ApiResponse {
  event: PublicEvent;
}

export interface DeleteEventResponse extends ApiResponse {}

export interface GetAllEventsResponse extends ApiResponse {
  events: PublicEvent[];
}

export interface CreateEventResponse extends ApiResponse {
  event: PublicEvent;
}

// LEADERBOARD

export interface GetLeaderboardResponse extends ApiResponse {
  leaderboard: PublicProfile[];
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

export interface GetOneMerchCollectionResponse extends ApiResponse {
  collection: PublicMerchCollection;
}

export interface GetAllMerchCollectionsResponse extends ApiResponse {
  collections: PublicMerchCollection[];
}

export interface CreateMerchCollectionResponse extends ApiResponse {
  collection: PublicMerchCollection;
}

export interface EditMerchCollectionResponse extends ApiResponse {
  collection: PublicMerchCollection;
}

export interface DeleteMerchCollectionResponse extends ApiResponse {}

export interface GetOneMerchItemResponse extends ApiResponse {
  item: PublicMerchItem;
}

export interface CreateMerchItemResponse extends ApiResponse {
  item: PublicMerchItem;
}

export interface EditMerchItemResponse extends ApiResponse {
  item: PublicMerchItem;
}

export interface DeleteMerchItemResponse extends ApiResponse {}

export interface CreateMerchItemOptionResponse extends ApiResponse {
  option: PublicMerchItemOption;
}

export interface DeleteMerchItemOptionResponse extends ApiResponse {}

export interface GetOneMerchOrderResponse extends ApiResponse {
  order: PublicOrder;
}

export interface GetAllMerchOrdersResponse extends ApiResponse {
  orders: PublicOrder[];
}

export interface PlaceMerchOrderResponse extends ApiResponse {
  order: PublicOrder;
}

export interface EditMerchOrderResponse extends ApiResponse {}

// USER

export interface PublicActivity {
  type: ActivityType,
  scope: ActivityScope,
  description: string,
  pointsEarned: number,
  timestamp: Date;
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

export interface PublicFeedback {
  uuid: Uuid,
  user: PublicProfile,
  title: string;
  description: string;
  timestamp: Date;
  status: FeedbackStatus;
  type: FeedbackType;
}

export interface GetUserActivityStreamResponse extends ApiResponse {
  activity: PublicActivity[];
}

export interface UpdateProfilePictureResponse extends ApiResponse {
  user: PrivateProfile;
}

export interface GetUserResponse extends ApiResponse {
  user: PrivateProfile | PublicProfile;
}

export interface GetCurrentUserResponse extends ApiResponse {
  user: PrivateProfile;
}

export interface PatchUserResponse extends ApiResponse {
  user: PrivateProfile;
}

export interface GetFeedbackResponse extends ApiResponse {
  feedback: PublicFeedback[];
}

export interface SubmitFeedbackResponse extends ApiResponse {
  feedback: PublicFeedback;
}

export interface UpdateFeedbackStatusResponse extends ApiResponse {
  feedback: PublicFeedback;
}
