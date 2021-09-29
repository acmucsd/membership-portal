import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, JoinColumn, OneToMany } from 'typeorm';
import { Uuid, PublicOrderPickupEvent } from '../types';
import { OrderModel } from './OrderModel';

@Entity('OrderPickupEvents')
export class OrderPickupEventModel extends BaseEntity {
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

  @OneToMany((type) => OrderModel, (order) => order.pickupEvent, { nullable: false })
  @JoinColumn({ name: 'order' })
  orders: OrderModel[];

  public getPublicOrderPickupEvent(canSeeOrders = false): PublicOrderPickupEvent {
    const pickupEvent: PublicOrderPickupEvent = {
      uuid: this.uuid,
      title: this.title,
      start: this.start,
      end: this.end,
      description: this.description,
    };
    if (canSeeOrders) pickupEvent.orders = this.orders.map((order) => order.getPublicOrder());
    return pickupEvent;
  }
}