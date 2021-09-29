import {
  Entity,
  BaseEntity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Uuid, PublicOrder, OrderStatus } from '../types';
import { UserModel } from './UserModel';
import { OrderItemModel } from './OrderItemModel';
import { OrderPickupEventModel } from './OrderPickupEventModel';

@Entity('Orders')
export class OrderModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.orders, { eager: true, nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('orders_per_user_index')
  user: UserModel;

  @Column('integer')
  totalCost: number;

  @Column('varchar', { length: 255, default: OrderStatus.PLACED })
  status: OrderStatus;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  @Index('recent_orders_index')
  orderedAt: Date;

  @ManyToOne((type) => OrderPickupEventModel, (pickupEvent) => pickupEvent.orders, { eager: true, nullable: false })
  @JoinColumn({ name: 'pickupEvent' })
  @Index('orders_by_pickupEvent_index')
  pickupEvent: OrderPickupEventModel;

  @OneToMany((type) => OrderItemModel, (item) => item.order, { cascade: true, eager: true })
  items: OrderItemModel[];

  public getPublicOrder(): PublicOrder {
    return {
      uuid: this.uuid,
      user: this.user.uuid,
      totalCost: this.totalCost,
      status: this.status,
      orderedAt: this.orderedAt,
      pickupEvent: this.pickupEvent.getPublicOrderPickupEvent(),
      items: this.items.map((oi) => oi.getPublicOrderItem()),
    };
  }
}
