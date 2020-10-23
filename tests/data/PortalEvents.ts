import { MerchandiseItemOptionModel } from 'models/MerchandiseItemOptionModel';
import { flatten } from 'underscore';
import { OrderItemModel } from '../../models/OrderItemModel';
import { ActivityModel } from '../../models/ActivityModel';
import { AttendanceModel } from '../../models/AttendanceModel';
import { MerchandiseCollectionModel } from '../../models/MerchandiseCollectionModel';
import { OrderModel } from '../../models/OrderModel';
import { UserModel } from '../../models/UserModel';
import { ActivityType } from '../../types';
import { EventModel } from '../../models/EventModel';
// import { PortalEvent } from './PortalEvent';

import { BaseEntity } from 'typeorm';
// import { CreateUsers, CreateEvents, CreateMerch, AttendEvents, OrderMerch } from './PortalEvents';

export interface PortalEventVisitor<T> {
  visitCreateUser(createUser: CreateUsers): T;
  visitCreateEvent(createEvent: CreateEvents): T;
  visitCreateMerch(createMerch: CreateMerch): T;
  visitAttendEvent(attendEvent: AttendEvents): T;
  visitOrderMerch(orderMerch: OrderMerch): T;
}

export abstract class PortalEvent {
  abstract decompose (): BaseEntity[];

  public accept<T>(visitor: PortalEventVisitor<T>): T {
    if (this instanceof CreateUsers) {
      return visitor.visitCreateUser(this);
    }
    if (this instanceof CreateEvents) {
      return visitor.visitCreateEvent(this);
    }
    if (this instanceof CreateMerch) {
      return visitor.visitCreateMerch(this);
    }
    if (this instanceof AttendEvents) {
      return visitor.visitAttendEvent(this);
    }
    if (this instanceof OrderMerch) {
      return visitor.visitOrderMerch(this);
    }
    throw Error('Unknown PortalEvent type');
  }
}


export class CreateUsers extends PortalEvent {
  constructor(private users: UserModel[]) { super(); }

  public static of(...users: UserModel[]) {
    return new CreateUsers(users);
  }

  decompose() {
    return flatten(this.users.map((u) => [
      u,
      ActivityModel.create({
        user: u,
        type: ActivityType.ACCOUNT_CREATE,
        public: true,
      }),
    ]));
  }
}

export class CreateEvents extends PortalEvent {
  constructor(private events: EventModel[]) { super(); }

  public static of(...events: EventModel[]) {
    return new CreateEvents(events);
  }

  decompose() {
    return this.events;
  }
}

export class AttendEvents extends PortalEvent {
  constructor(private users: UserModel[], private events: EventModel[], private asStaff = false) { super(); }

  public static user(user: UserModel, asStaff = false, ...events: EventModel[]) {
    return new AttendEvents([user], events, asStaff);
  }

  public static event(event: EventModel, asStaff = false, ...users: UserModel[]) {
    return new AttendEvents(users, [event], asStaff);
  }

  decompose() {
    console.log(this.users);
    console.log(this.asStaff);
    console.log(this.events);
    return flatten(this.events.map((e) => {
      const pointsEarned = e.pointValue + (this.asStaff ? e.staffPointBonus : 0);
      return flatten(this.users.map((u) => {
        u.points += pointsEarned;
        u.credits += pointsEarned * 100;
        const timestamp = this.getDateDuring(e);
        return [
          AttendanceModel.create({
            user: u,
            event: e,
            timestamp,
            asStaff: this.asStaff,
          }),
          ActivityModel.create({
            user: u,
            type: this.asStaff ? ActivityType.ATTEND_EVENT_AS_STAFF : ActivityType.ATTEND_EVENT,
            timestamp,
            public: true,
          }),
        ];
      }));
    }));
  }

  private getDateDuring(event: EventModel) {
    const { start, end } = event;
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

export class CreateMerch extends PortalEvent {
  constructor(private merch: MerchandiseCollectionModel[]) { super(); }

  public static of(...merch: MerchandiseCollectionModel[]) {
    return new CreateMerch(merch);
  }

  decompose() {
    return this.merch;
  }
}

export class OrderMerch extends PortalEvent {
  constructor(private user: UserModel, private order: { option: MerchandiseItemOptionModel, quantity: number }[]) {
    super();
  }

  public static of(user: UserModel, order: { option: MerchandiseItemOptionModel, quantity: number }[]) {
    return new OrderMerch(user, order);
  }

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
