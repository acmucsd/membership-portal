import {
  Entity,
  BaseEntity,
  Column,
  Generated,
  PrimaryGeneratedColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Uuid, PublicOrder } from '../types';
import { UserModel } from './UserModel';
import { OrderItemModel } from './OrderItemModel';

@Entity('Orders')
export class OrderModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.orders, { eager: true, nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('orders_per_user_index')
  user: UserModel;

  @Column()
  totalCost: number;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  @Index('recent_orders_index')
  orderedAt: Date;

  @OneToMany((type) => OrderItemModel, (item) => item.order, { cascade: true, eager: true })
  items: OrderItemModel[];

  public getPublicOrder(): PublicOrder {
    return {
      uuid: this.uuid,
      user: this.user.uuid,
      totalCost: this.totalCost,
      orderedAt: this.orderedAt,
      items: this.items.map((oi) => oi.getPublicOrderItem()),
    };
  }
}
