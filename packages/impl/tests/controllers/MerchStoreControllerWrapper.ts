import * as moment from 'moment';
import { Connection } from 'typeorm';
import { MerchStoreController } from '../../api/controllers/MerchStoreController';
import { UuidParam } from '../../api/validators/GenericRequests';
import { OrderPickupEventModel } from '../../database/models/OrderPickupEventModel';
import { UserModel } from '../../database/models/UserModel';
import { FulfillMerchOrderRequest } from '@acmucsd/membership-portal-types';

/**
 * Wrapper class over MerchStoreController for performing merch controller
 * operations that require common setup for tests.
 */
export class MerchStoreControllerWrapper {
  /**
   * Wraps MerchStoreController::fulfillMerchOrderItems, but changing the start/end times
   * of the order's pickup event to be set to today before making the controller call,
   * since orders can only be fulfilled on the day of their pickup event.
   *
   * The start/end times are reverted back before the function returns.
   */
  public static async fulfillMerchOrderItems(merchController: MerchStoreController,
    fulfillOrderParams: UuidParam, itemsToFulfill: FulfillMerchOrderRequest, distributor: UserModel,
    conn: Connection, pickupEvent: OrderPickupEventModel) {
    const originalStart = pickupEvent.start;
    const originalEnd = pickupEvent.end;

    // move pickup event to today
    const startHour = moment(pickupEvent.start).hours();
    const startMinute = moment(pickupEvent.start).minutes();
    const newStart = moment().hour(startHour).minute(startMinute).toDate();
    const endHour = moment(pickupEvent.end).hours();
    const endMinute = moment(pickupEvent.end).minutes();
    const newEnd = moment().hour(endHour).minute(endMinute).toDate();
    const dateUpdateParams = { uuid: pickupEvent.uuid };
    const dateUpdates = {
      start: newStart,
      end: newEnd,
    };
    await conn.manager.update(OrderPickupEventModel, dateUpdateParams, dateUpdates);

    // fulfill order items
    await merchController.fulfillMerchOrderItems(fulfillOrderParams, itemsToFulfill, distributor);

    // move pickup event back to original day
    const dateRollback = {
      start: originalStart,
      end: originalEnd,
    };
    await conn.manager.update(OrderPickupEventModel, dateUpdateParams, dateRollback);
  }
}
