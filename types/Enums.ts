export enum UserAccessType {
  RESTRICTED = 'RESTRICTED',
  STANDARD = 'STANDARD',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
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
}

export enum ActivityType {
  ACCOUNT_CREATE = 'ACCOUNT_CREATE',
  ACCOUNT_ACTIVATE = 'ACCOUNT_ACTIVATE',
  ACCOUNT_RESET_PASS = 'ACCOUNT_RESET_PASS',
  ACCOUNT_RESET_PASS_REQUEST = 'ACCOUNT_RESET_PASS_REQUEST',
  ACCOUNT_UPDATE_INFO = 'ACCOUNT_UPDATE_INFO',
  ACCOUNT_LOGIN = 'ACCOUNT_LOGIN',
  ATTEND_EVENT = 'ATTEND_EVENT',
  ATTEND_EVENT_AS_STAFF = 'ATTEND_EVENT_AS_STAFF',
  BONUS_POINTS = 'BONUS_POINTS',
  MILESTONE = 'MILESTONE',
  ORDER_MERCHANDISE = 'ORDER_MERCHANDISE',
  SUBMIT_EVENT_FEEDBACK = 'SUBMIT_EVENT_FEEDBACK',
  SUBMIT_FEEDBACK = 'SUBMIT_FEEDBACK',
  FEEDBACK_ACKNOWLEDGED = 'FEEDBACK_ACKNOWLEDGED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_FULFILLED = 'ORDER_FULFILLED',
  ORDER_PARTIALLY_FULFILLED = 'ORDER_PARTIALLY_FULFILLED',
  ORDER_MISSED = 'ORDER_MISSED',
  PENDING_ORDERS_CANCELLED = 'PENDING_ORDERS_CANCELLED',
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
  PICKUP_MISSED = 'PICKUP_MISSED',
  PICKUP_CANCELLED = 'PICKUP_CANCELLED',
}
