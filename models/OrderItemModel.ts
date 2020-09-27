import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Uuid, PublicOrderItem } from '../types';
import { OrderModel } from './OrderModel';
import { MerchandiseItemOptionModel } from './MerchandiseItemOptionModel';

@Entity('OrderItems')
export class OrderItemModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => OrderModel, (order) => order.items, { nullable: false })
  @JoinColumn({ name: 'order' })
  order: OrderModel;

  @ManyToOne((type) => MerchandiseItemOptionModel, (option) => option.orders, { eager: true, nullable: false })
  @JoinColumn({ name: 'option' })
  option: MerchandiseItemOptionModel;

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
      option: this.option.getPublicMerchItemOption(),
      salePriceAtPurchase: this.salePriceAtPurchase,
      discountPercentageAtPurchase: this.discountPercentageAtPurchase,
      fulfilled: this.fulfilled,
      fulfilledAt: this.fulfilledAt,
      notes: this.notes,
    };
  }
}
