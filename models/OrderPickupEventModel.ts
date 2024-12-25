import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Uuid, PublicOrderPickupEvent, OrderPickupEventStatus } from '../types';
import { OrderModel } from './OrderModel';
import { EventModel } from './EventModel';

@Entity('OrderPickupEvents')
export class OrderPickupEventModel {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('timestamptz')
  start: Date;

  @Column('timestamptz')
  end: Date;

  @Column('text')
  description: string;

  @Column('integer')
  orderLimit: number;

  @Column('varchar', { length: 255, default: OrderPickupEventStatus.ACTIVE })
  status: OrderPickupEventStatus;

  @OneToMany((type) => OrderModel, (order) => order.pickupEvent, { nullable: false })
  @JoinColumn({ name: 'order' })
  orders: OrderModel[];

  @OneToOne((type) => EventModel, { nullable: true })
  @JoinColumn({ name: 'linkedEvent' })
  linkedEvent: EventModel;

  public getPublicOrderPickupEvent(canSeeOrders = false): PublicOrderPickupEvent {
    const pickupEvent: PublicOrderPickupEvent = {
      uuid: this.uuid,
      title: this.title,
      start: this.start,
      end: this.end,
      description: this.description,
      orderLimit: this.orderLimit,
      status: this.status,
      linkedEvent: this.linkedEvent ? this.linkedEvent.getPublicEvent() : null,
    };

    if (canSeeOrders) pickupEvent.orders = this.orders.map((order) => order.getPublicOrderWithItems());
    return pickupEvent;
  }
}
