import {
  Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Uuid, PublicMerchItemOption } from '../types';
import { OrderItemModel } from './OrderItemModel';
import { MerchandiseItemModel } from './MerchandiseItemModel';

@Entity('MerchandiseItemOptions')
export class MerchandiseItemOptionModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => MerchandiseItemModel, (merchItem) => merchItem.options, { nullable: false, onDelete: 'CASCADE' })
  @Index('merch_item_options_index')
  @JoinColumn({ name: 'item' })
  item: MerchandiseItemModel;

  @Column({ default: 0 })
  quantity: number;

  @Column()
  price: number;

  @Column({ default: 0 })
  discountPercentage: number;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to(value: object): string {
        return JSON.stringify(value);
      },
      from(value: string): object {
        return value ? JSON.parse(value) : null;
      },
    },
  })
  metadata: object;

  @OneToMany((type) => OrderItemModel, (orderItem) => orderItem.option)
  orders: OrderItemModel;

  public getPrice(): number {
    return Math.round(this.price * (1 - (this.discountPercentage / 100)));
  }

  public getPublicMerchItemOption(): PublicMerchItemOption {
    return {
      uuid: this.uuid,
      price: this.price,
      discountPercentage: this.discountPercentage,
      metadata: this.metadata,
    };
  }
}
