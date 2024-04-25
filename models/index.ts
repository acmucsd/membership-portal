import { UserModel } from './UserModel';
import { ActivityModel } from './ActivityModel';
import { EventModel } from './EventModel';
import { AttendanceModel } from './AttendanceModel';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';
import { MerchCollectionPhotoModel } from './MerchCollectionPhotoModel';
import { MerchandiseItemModel } from './MerchandiseItemModel';
import { MerchandiseItemPhotoModel } from './MerchandiseItemPhotoModel';
import { OrderModel } from './OrderModel';
import { OrderItemModel } from './OrderItemModel';
import { MerchandiseItemOptionModel } from './MerchandiseItemOptionModel';
import { FeedbackModel } from './FeedbackModel';
import { OrderPickupEventModel } from './OrderPickupEventModel';
import { ResumeModel } from './ResumeModel';
import { UserSocialMediaModel } from './UserSocialMediaModel';
import { ExpressCheckinModel } from './ExpressCheckinModel';

export const models = [
  UserModel,
  FeedbackModel,
  ActivityModel,
  EventModel,
  AttendanceModel,
  MerchandiseCollectionModel,
  MerchCollectionPhotoModel,
  MerchandiseItemModel,
  MerchandiseItemPhotoModel,
  MerchandiseItemOptionModel,
  OrderModel,
  OrderItemModel,
  OrderPickupEventModel,
  ResumeModel,
  UserSocialMediaModel,
  ExpressCheckinModel,
];

// can't export imports in the same line if imports are used in the file so must export separately
export {
  UserModel,
  FeedbackModel,
  ActivityModel,
  EventModel,
  AttendanceModel,
  MerchandiseCollectionModel,
  MerchCollectionPhotoModel,
  MerchandiseItemModel,
  MerchandiseItemPhotoModel,
  MerchandiseItemOptionModel,
  OrderModel,
  OrderItemModel,
  OrderPickupEventModel,
  ResumeModel,
  UserSocialMediaModel,
  ExpressCheckinModel,
};
