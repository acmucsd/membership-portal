import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Uuid, PublicOrderItem } from '../types';
import { OrderModel } from './OrderModel';
import { MerchandiseModel } from './MerchandiseItemModel';

@Entity('OrderItems')
export class OrderItemModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  @Index({ unique: true })
  uuid: Uuid;

  @ManyToOne((type) => OrderModel, (order) => order.items)
  @JoinColumn({ name: 'order' })
  order: OrderModel;

  @ManyToOne((type) => MerchandiseModel, (item) => item.orders, { eager: true })
  @JoinColumn({ name: 'item' })
  item: MerchandiseModel;

  @Column()
  salePriceAtPurchase: number;

  @Column()
  discountPercentageAtPurchase: number;

  @Column({ default: false })
  fulfilled: boolean;

  @Column('timestamptz', { nullable: true })
  fulfilledAt: Date;

  @Column('text', { nullable: true })
  notes: string;

  public getPublicOrderItem(): PublicOrderItem {
    return {
      uuid: this.uuid,
      item: this.item.getPublicMerchItem(),
      salePriceAtPurchase: this.salePriceAtPurchase,
      discountPercentageAtPurchase: this.discountPercentageAtPurchase,
      fulfilled: this.fulfilled,
      fulfilledAt: this.fulfilledAt,
      notes: this.notes,
    };
  }
}
