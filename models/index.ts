import { UserModel } from './UserModel';
import { ActivityModel } from './ActivityModel';
import { EventModel } from './EventModel';
import { AttendanceModel } from './AttendanceModel';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';
import { MerchandiseItemModel } from './MerchandiseItemModel';
import { OrderModel } from './OrderModel';
import { OrderItemModel } from './OrderItemModel';
import { MerchandiseItemOptionModel } from './MerchandiseItemOptionModel';
import { EventFeedbackModel } from './EventFeedbackModel';
import { UserFeedbackModel } from './UserFeedbackModel';

export const models = [
  UserModel,
  UserFeedbackModel,
  ActivityModel,
  EventModel,
  EventFeedbackModel,
  AttendanceModel,
  MerchandiseCollectionModel,
  MerchandiseItemModel,
  MerchandiseItemOptionModel,
  OrderModel,
  OrderItemModel,
];
