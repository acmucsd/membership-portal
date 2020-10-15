import { BaseEntity } from 'typeorm';
import { MerchandiseItemOptionModel } from 'models/MerchandiseItemOptionModel';
import { flatten } from 'underscore';
import { OrderItemModel } from 'models/OrderItemModel';
import { ActivityModel } from '../models/ActivityModel';
import { AttendanceModel } from '../models/AttendanceModel';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { ActivityType } from '../types';
import { EventModel } from '../models/EventModel';

export interface PortalEvent {
  decompose(): BaseEntity[];
}

export class PortalState {
  constructor(private readonly state: PortalEvent[]) {
  }

  public static builder(): PortalState {
    return new PortalState([]);
  }

  public entities(): BaseEntity[] {
    return flatten(this.state.map((pe) => pe.decompose()));
  }
}

export class CreateUser implements PortalEvent {
  constructor(private user: UserModel) {}

  decompose() {
    return [
      this.user,
      ActivityModel.create({
        user: this.user,
        type: ActivityType.ACCOUNT_CREATE,
        public: true,
      }),
    ];
  }
}

export class CreateEvent implements PortalEvent {
  constructor(private event: EventModel) {}

  decompose() {
    return [
      this.event,
    ];
  }
}

export class AttendEvent implements PortalEvent {
  constructor(private user: UserModel, private event: EventModel, private asStaff = false) {}

  decompose() {
    const pointsEarned = this.event.pointValue + (this.asStaff ? this.event.staffPointBonus : 0);
    this.user.points += pointsEarned;
    this.user.credits += pointsEarned * 100;
    const timestamp = this.getDateDuring(this.event);
    return [
      AttendanceModel.create({
        user: this.user,
        event: this.event,
        timestamp,
        asStaff: this.asStaff,
      }),
      ActivityModel.create({
        user: this.user,
        type: this.asStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
        timestamp,
        public: true,
      }),
    ];
  }

  private getDateDuring(event: EventModel) {
    const { start, end } = event;
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

export class CreateMerch implements PortalEvent {
  constructor(private merch: MerchandiseCollectionModel) {}

  decompose() {
    return [
      this.merch,
    ];
  }
}

export class OrderMerch implements PortalEvent {
  constructor(private user: UserModel, private order: { option: MerchandiseItemOptionModel, quantity: number}[]) {}

  decompose() {
    const totalCost = this.order.reduce((sum, m) => m.option.getPrice() * m.quantity, 0);
    this.user.credits -= totalCost;
    this.order.forEach(({ option, quantity }) => {
      option.quantity -= quantity;
    });
    return [
      OrderModel.create({
        user: this.user,
        totalCost,
        items: flatten(this.order.map(({ option, quantity }) => Array(quantity).fill(OrderItemModel.create({
          option,
          salePriceAtPurchase: option.getPrice(),
          discountPercentageAtPurchase: option.discountPercentage,
        })))),
      }),
      ActivityModel.create({
        user: this.user,
        type: ActivityType.ORDER_MERCHANDISE,
      }),
    ];
  }
}
