import { MerchandiseItemModel, EventModel, UserModel } from '../../models';
import { ActivityScope, ActivityType } from '..';

export type Attendance = {
  user: UserModel,
  event: EventModel,
  asStaff: boolean,
};

export type Activity = {
  user: UserModel,
  type: ActivityType,
  scope?: ActivityScope,
  pointsEarned?: number,
  description?: string,
};

export const ActivityTypeToScope = {
  [ActivityType.ACCOUNT_CREATE]: ActivityScope.PUBLIC,
  [ActivityType.ATTEND_EVENT]: ActivityScope.PUBLIC,
  [ActivityType.ATTEND_EVENT_AS_STAFF]: ActivityScope.PUBLIC,
  [ActivityType.BONUS_POINTS]: ActivityScope.PUBLIC,
  [ActivityType.MILESTONE]: ActivityScope.PUBLIC,
  [ActivityType.FEEDBACK_ACKNOWLEDGED]: ActivityScope.PRIVATE,
  [ActivityType.ORDER_PLACED]: ActivityScope.PRIVATE,
  [ActivityType.ORDER_CANCELLED]: ActivityScope.PRIVATE,
  [ActivityType.ORDER_FULFILLED]: ActivityScope.PRIVATE,
  [ActivityType.ORDER_MISSED]: ActivityScope.PRIVATE,
  [ActivityType.ORDER_PARTIALLY_FULFILLED]: ActivityScope.PRIVATE,
  [ActivityType.PENDING_ORDERS_CANCELLED]: ActivityScope.PRIVATE,
  [ActivityType.SUBMIT_EVENT_FEEDBACK]: ActivityScope.PRIVATE,
  [ActivityType.SUBMIT_FEEDBACK]: ActivityScope.PRIVATE,
  [ActivityType.ACCOUNT_ACTIVATE]: ActivityScope.HIDDEN,
  [ActivityType.ACCOUNT_LOGIN]: ActivityScope.HIDDEN,
  [ActivityType.ACCOUNT_RESET_PASS]: ActivityScope.HIDDEN,
  [ActivityType.ACCOUNT_RESET_PASS_REQUEST]: ActivityScope.HIDDEN,
  [ActivityType.ACCOUNT_UPDATE_INFO]: ActivityScope.HIDDEN,
  [ActivityType.RESUME_UPLOAD]: ActivityScope.HIDDEN,
};

export type OrderItemPriceAndQuantity = {
  price: number,
  quantity: number,
};

export type MerchItemWithQuantity = {
  item: MerchandiseItemModel,
  quantity: number,
};
