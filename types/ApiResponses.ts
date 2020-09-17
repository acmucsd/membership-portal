import {
  PublicAttendance,
  PrivateProfile,
  PublicEvent,
  PublicProfile,
  PublicMerchCollection,
  PublicMerchItem,
  PublicOrder,
  PublicActivity,
} from '.';

export interface CustomErrorResponse {
  error: {
    name: string;
    message: string;
    status: number;
    stack?: string;
  }
}

export interface APIResponse {
  error: null | CustomErrorResponse;
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

export interface RegisterUserResponse extends APIResponse {
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

export interface UploadEventCoverResponse extends APIResponse {
  event: PublicEvent;
}

export interface GetOneEventResponse extends APIResponse {
  event: PublicEvent;
}

export interface UpdateEventResponse extends APIResponse {
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
  leaderboard: PublicProfile;
}

// MERCH STORE

export interface GetOneMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

export interface GetAllMerchCollectionsResponse extends APIResponse {
  collection: PublicMerchCollection[];
}

export interface CreateMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

export interface EditMerchCollectionResponse extends APIResponse {}

export interface DeleteMerchCollectionResponse extends APIResponse {
  collection: PublicMerchCollection;
}

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
  activity: PublicActivity;
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

export interface PatchCurrentUserResponse extends APIResponse {
  user: PrivateProfile;
}
