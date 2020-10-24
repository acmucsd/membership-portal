import { Connection } from 'typeorm';
import * as rfdc from 'rfdc';
import { flatten } from 'underscore';
import { AttendanceModel } from '../../models/AttendanceModel';
import { EventModel } from '../../models/EventModel';
import { MerchandiseCollectionModel } from '../../models/MerchandiseCollectionModel';
import { OrderModel } from '../../models/OrderModel';
import { UserModel } from '../../models/UserModel';
import { ActivityModel } from '../../models/ActivityModel';
import { ActivityType } from '../../types';
import { MerchandiseItemOptionModel } from '../../models/MerchandiseItemOptionModel';
import { OrderItemModel } from '../../models/OrderItemModel';

export class PortalState {
  users: UserModel[] = [];

  events: EventModel[] = [];

  attendances: AttendanceModel[] = [];

  activities: ActivityModel[] = [];

  merch: MerchandiseCollectionModel[] = [];

  orders: OrderModel[] = [];

  public from(state?: PortalState): PortalState {
    if (!state) return this;
    // deep clones all around for immutable PortalStates
    this.users = rfdc()(state.users);
    this.events = rfdc()(state.events);
    this.attendances = rfdc()(state.attendances);
    this.activities = rfdc()(state.activities);
    this.merch = rfdc()(state.merch);
    this.orders = rfdc()(state.orders);
  }

  public async write(conn: Connection): Promise<void> {
    await conn.transaction(async (txn) => {
      this.users = await txn.save(this.users);
      this.events = await txn.save(this.events);
      this.attendances = await txn.save(this.attendances);
      this.activities = await txn.save(this.activities);
      this.merch = await txn.save(this.merch);
    });
  }

  public createUsers(users: UserModel[]): PortalState {
    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      this.users.push(user);
      this.activities.push(ActivityModel.create({
        user,
        type: ActivityType.ACCOUNT_CREATE,
        public: true,
      }));
    }
    return this;
  }

  public createEvents(events: EventModel[]): PortalState {
    this.events = this.events.concat(events);
    return this;
  }

  public createMerch(merch: MerchandiseCollectionModel[]): PortalState {
    this.merch = this.merch.concat(merch);
    return this;
  }

  public attendEvents(users: UserModel[], events: EventModel[], asStaff = false): PortalState {
    for (let e = 0; e < events.length; e += 1) {
      const event = events[e];
      const pointsEarned = event.pointValue; // TODO
      for (let u = 0; u < users.length; u += 1) {
        const user = users[u];
        user.points += pointsEarned;
        user.credits += pointsEarned * 100;
        const timestamp = this.getDateDuring(event);
        this.attendances.push(AttendanceModel.create({
          user,
          event,
          timestamp,
          asStaff,
        }));
        this.activities.push(ActivityModel.create({
          user,
          type: asStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
          timestamp,
          public: true,
        }));
      }
    }
    return this;
  }

  public orderMerch(user: UserModel, order: MerchItemOptionAndQuantity[]): PortalState {
    const totalCost = order.reduce((sum, m) => m.option.getPrice() * m.quantity, 0);
    user.credits -= totalCost;
    order.forEach(({ option, quantity }) => {
      option.quantity -= quantity;
    });
    this.orders.push(OrderModel.create({
      user,
      totalCost,
      items: flatten(order.map(({ option, quantity }) => Array(quantity).fill(OrderItemModel.create({
        option,
        salePriceAtPurchase: option.getPrice(),
        discountPercentageAtPurchase: option.discountPercentage,
      })))),
    }));
    this.activities.push(ActivityModel.create({
      user,
      type: ActivityType.ORDER_MERCHANDISE,
    }));
    return this;
  }

  private getDateDuring(event: EventModel) {
    const { start, end } = event;
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

export interface MerchItemOptionAndQuantity {
  option: MerchandiseItemOptionModel;
  quantity: number;
}
