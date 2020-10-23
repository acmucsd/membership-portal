import { BaseEntity } from 'typeorm';
import { CreateUsers, CreateEvents, CreateMerch, AttendEvents, OrderMerch } from './PortalEvents';

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
