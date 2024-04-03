export enum UserAccessType {
  RESTRICTED = 'RESTRICTED',
  STANDARD = 'STANDARD',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
  MARKETING = 'MARKETING',
  MERCH_STORE_MANAGER = 'MERCH_STORE_MANAGER',
  MERCH_STORE_DISTRIBUTOR = 'MERCH_STORE_DISTRIBUTOR',
  SPONSORSHIP_MANAGER = 'SPONSORSHIP_MANAGER',
}

export enum UserState {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

export enum MediaType {
  EVENT_COVER = 'EVENT_COVER',
  PROFILE_PICTURE = 'PROFILE_PICTURE',
  BANNER = 'BANNER',
  MERCH_PHOTO = 'MERCH_PHOTO',
  RESUME = 'RESUME',
}

export enum ActivityType {
  ACCOUNT_CREATE = 'ACCOUNT_CREATE',
  ACCOUNT_ACTIVATE = 'ACCOUNT_ACTIVATE',
  ACCOUNT_RESET_PASS = 'ACCOUNT_RESET_PASS',
  ACCOUNT_RESET_PASS_REQUEST = 'ACCOUNT_RESET_PASS_REQUEST',
  ACCOUNT_UPDATE_INFO = 'ACCOUNT_UPDATE_INFO',
  ACCOUNT_ACCESS_LEVEL_UPDATE = 'ACCOUNT_ACCESS_LEVEL_UPDATE',
  ACCOUNT_LOGIN = 'ACCOUNT_LOGIN',
  ATTEND_EVENT = 'ATTEND_EVENT',
  ATTEND_EVENT_AS_STAFF = 'ATTEND_EVENT_AS_STAFF',
  BONUS_POINTS = 'BONUS_POINTS',
  MILESTONE = 'MILESTONE',
  ORDER_PLACED = 'ORDER_PLACED',
  SUBMIT_EVENT_FEEDBACK = 'SUBMIT_EVENT_FEEDBACK',
  SUBMIT_FEEDBACK = 'SUBMIT_FEEDBACK',
  FEEDBACK_ACKNOWLEDGED = 'FEEDBACK_ACKNOWLEDGED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_FULFILLED = 'ORDER_FULFILLED',
  ORDER_PARTIALLY_FULFILLED = 'ORDER_PARTIALLY_FULFILLED',
  ORDER_MISSED = 'ORDER_MISSED',
  PENDING_ORDERS_CANCELLED = 'PENDING_ORDERS_CANCELLED',
  RESUME_UPLOAD = 'RESUME_UPLOAD',
}

export enum ActivityScope {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  HIDDEN = 'HIDDEN',
}

export enum FeedbackType {
  GENERAL = 'GENERAL',
  MERCH_STORE = 'MERCH_STORE',
  BIT_BYTE = 'BIT_BYTE',
  AI = 'AI',
  CYBER = 'CYBER',
  DESIGN = 'DESIGN',
  HACK = 'HACK',
  INNOVATE = 'INNOVATE',
}

export enum FeedbackStatus {
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IGNORED = 'IGNORED',
}

export enum OrderStatus {
  PLACED = 'PLACED',
  CANCELLED = 'CANCELLED',
  FULFILLED = 'FULFILLED',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED',
  PICKUP_MISSED = 'PICKUP_MISSED',
  PICKUP_CANCELLED = 'PICKUP_CANCELLED',
}

export enum OrderPickupEventStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum SocialMediaType {
  LINKEDIN = 'LINKEDIN',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  PORTFOLIO = 'PORTFOLIO',
  TWITTER = 'TWITTER',
  GITHUB = 'GITHUB',
  EMAIL = 'EMAIL',
  DEVPOST = 'DEVPOST',
}
