import {
  ActivityScope, ActivityType, FeedbackStatus,
  FeedbackType, OrderPickupEventStatus,
  OrderStatus, UserAccessType, SocialMediaType,
} from './Enums';
import { MerchItemOptionMetadata, Uuid } from '.';

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

export interface GetAllNamesAndEmailsResponse extends ApiResponse {
  namesAndEmails: NameAndEmail[];
}

export interface SubmitAttendanceForUsersResponse extends ApiResponse {
  attendances: PublicAttendance[];
}

export interface ModifyUserAccessLevelResponse extends ApiResponse {
  updatedUsers: PrivateProfile[];
}

export interface GetAllUserAccessLevelsResponse extends ApiResponse {
  users: PrivateProfile[];
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

export interface PublicExpressCheckin {
  email: string;
  event: PublicEvent;
  timestamp: Date;
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

export interface EmailModificationResponse extends ApiResponse {}

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
  discordEvent: Uuid;
  googleCalendarEvent: Uuid;
  foodItems: string;
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
  themeColorHex?: string;
  description: string;
  items: PublicMerchItem[];
  collectionPhotos: PublicMerchCollectionPhoto[]
  createdAt: Date;
}

export interface PublicMerchItem {
  uuid: Uuid;
  itemName: string;
  collection?: PublicMerchCollection;
  description: string;
  monthlyLimit: number;
  lifetimeLimit: number;
  hidden: boolean;
  hasVariantsEnabled: boolean;
  merchPhotos: PublicMerchItemPhoto[];
  options: PublicMerchItemOption[];
}

export interface PublicMerchItemWithPurchaseLimits extends PublicMerchItem {
  monthlyRemaining: number;
  lifetimeRemaining: number;
}

export interface PublicCartMerchItem {
  uuid: Uuid;
  itemName: string;
  uploadedPhoto: string;
  description: string;
}

export interface PublicMerchItemOption {
  uuid: Uuid;
  price: number;
  quantity: number;
  discountPercentage: number;
  metadata: MerchItemOptionMetadata;
}

export interface PublicMerchItemPhoto {
  uuid: Uuid;
  uploadedPhoto: string;
  position: number;
  uploadedAt: Date;
}

export interface PublicMerchCollectionPhoto {
  uuid: Uuid;
  uploadedPhoto: string;
  position: number;
  uploadedAt: Date
}

export interface PublicOrderMerchItemOption {
  uuid: Uuid;
  price: number;
  discountPercentage: number;
  metadata: MerchItemOptionMetadata;
  item: PublicCartMerchItem;
}

export interface PublicOrderItem {
  uuid: Uuid;
  option: PublicOrderMerchItemOption;
  salePriceAtPurchase: number;
  discountPercentageAtPurchase: number;
  fulfilled: boolean;
  fulfilledAt?: Date;
  notes?: string;
}

export interface PublicOrder {
  uuid: Uuid;
  user: PublicProfile;
  totalCost: number;
  status: OrderStatus;
  orderedAt: Date;
  pickupEvent: PublicOrderPickupEvent;
}

export interface PublicOrderWithItems extends PublicOrder {
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

export interface CreateCollectionPhotoResponse extends ApiResponse {
  collectionPhoto: PublicMerchCollectionPhoto;
}

export interface DeleteCollectionPhotoResponse extends ApiResponse {}

export interface GetOneMerchItemResponse extends ApiResponse {
  item: PublicMerchItemWithPurchaseLimits;
}

export interface CreateMerchItemResponse extends ApiResponse {
  item: PublicMerchItem;
}

export interface EditMerchItemResponse extends ApiResponse {
  item: PublicMerchItem;
}

export interface DeleteMerchItemResponse extends ApiResponse {}

export interface CreateMerchPhotoResponse extends ApiResponse {
  merchPhoto: PublicMerchItemPhoto;
}

export interface DeleteMerchItemPhotoResponse extends ApiResponse {}

export interface CreateMerchItemOptionResponse extends ApiResponse {
  option: PublicMerchItemOption;
}

export interface DeleteMerchItemOptionResponse extends ApiResponse {}

export interface GetOneMerchOrderResponse extends ApiResponse {
  order: PublicOrderWithItems;
}

export interface GetMerchOrdersResponse extends ApiResponse {
  orders: PublicOrder[];
}

export interface PlaceMerchOrderResponse extends ApiResponse {
  order: PublicOrderWithItems;
}

export interface VerifyMerchOrderResponse extends ApiResponse {}

export interface EditMerchOrderResponse extends ApiResponse {}

export interface CancelMerchOrderResponse extends ApiResponse {
  order: PublicOrderWithItems;
}

export interface GetCartResponse extends ApiResponse {
  cart: PublicOrderMerchItemOption[];
}
export interface FulfillMerchOrderResponse extends ApiResponse {
  order: PublicOrder;
}

// USER
export interface NameAndEmail {
  firstName: string;
  lastName: string;
  email: string;
}

export interface PublicActivity {
  type: ActivityType,
  scope: ActivityScope,
  description: string,
  pointsEarned: number,
  timestamp: Date;
}

export interface PublicProfile {
  uuid: Uuid,
  handle: string,
  firstName: string,
  lastName: string,
  profilePicture: string,
  graduationYear: number,
  major: string,
  bio: string,
  points: number,
  userSocialMedia?: PublicUserSocialMedia[];
  isAttendancePublic: boolean,
}

export interface PrivateProfile extends PublicProfile {
  email: string,
  accessType: UserAccessType,
  state: string,
  credits: number,
  resumes?: PublicResume[],
  onboardingSeen: boolean,
}

export interface PublicFeedback {
  uuid: Uuid,
  user: PublicProfile,
  event: PublicEvent,
  source: string;
  description: string;
  timestamp: Date;
  status: FeedbackStatus;
  type: FeedbackType;
}

export interface PublicUserSocialMedia {
  uuid: Uuid,
  user?: PublicProfile,
  type: SocialMediaType,
  url: string
}

export interface GetUserActivityStreamResponse extends ApiResponse {
  activity: PublicActivity[];
}

export interface GetVisibleResumesResponse extends ApiResponse {
  resumes: PublicResume[];
}

export interface UpdateProfilePictureResponse extends ApiResponse {
  user: PrivateProfile;
}

export interface UpdateResumeResponse extends ApiResponse {
  resume: PublicResume;
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

export interface GetUserSocialMediaResponse extends ApiResponse {
  userSocialMedia: PublicUserSocialMedia[];
}

export interface InsertSocialMediaResponse extends ApiResponse {
  userSocialMedia: PublicUserSocialMedia[];
}

export interface UpdateSocialMediaResponse extends ApiResponse {
  userSocialMedia: PublicUserSocialMedia[];
}

export interface DeleteSocialMediaResponse extends ApiResponse {}

export interface PublicOrderPickupEvent {
  uuid: Uuid;
  title: string;
  start: Date;
  end: Date;
  description: string;
  orders?: PublicOrderWithItems[];
  orderLimit?: number;
  status: OrderPickupEventStatus;
  linkedEvent?: PublicEvent;
}

export interface GetOrderPickupEventsResponse extends ApiResponse {
  pickupEvents: PublicOrderPickupEvent[];
}

export interface GetOrderPickupEventResponse extends ApiResponse {
  pickupEvent: PublicOrderPickupEvent;
}

export interface CreateOrderPickupEventResponse extends ApiResponse {
  pickupEvent: PublicOrderPickupEvent;
}

export interface EditOrderPickupEventResponse extends ApiResponse {
  pickupEvent: PublicOrderPickupEvent;
}

export interface DeleteOrderPickupEventResponse extends ApiResponse {}

export interface CancelOrderPickupEventResponse extends ApiResponse {}

export interface CompleteOrderPickupEventResponse extends ApiResponse {
  orders: PublicOrder[];
}

export interface CancelAllPendingOrdersResponse extends ApiResponse {}

export interface PublicResume {
  uuid: Uuid;
  user?: PublicProfile;
  isResumeVisible: boolean;
  url: string;
  lastUpdated: Date;
}

export interface PatchResumeResponse extends ApiResponse {
  resume: PublicResume;
}

export interface DeleteResumeResponse extends ApiResponse {}
