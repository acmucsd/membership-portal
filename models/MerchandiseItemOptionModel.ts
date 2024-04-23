import {
  Entity, BaseEntity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Uuid, PublicMerchItemOption, MerchItemOptionMetadata, PublicOrderMerchItemOption } from '@customtypes';
import { OrderItemModel, MerchandiseItemModel } from '@models';

@Entity('MerchandiseItemOptions')
export class MerchandiseItemOptionModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => MerchandiseItemModel, (merchItem) => merchItem.options, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item' })
  @Index('merch_item_options_index')
  item: MerchandiseItemModel;

  @Column('integer', { default: 0 })
  quantity: number;

  @Column('integer')
  price: number;

  @Column('integer', { default: 0 })
  discountPercentage: number;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to(value: MerchItemOptionMetadata): string {
        return JSON.stringify(value);
      },
      from(value: string): MerchItemOptionMetadata {
        return value ? JSON.parse(value) : null;
      },
    },
  })
  metadata: MerchItemOptionMetadata;

  @OneToMany((type) => OrderItemModel, (orderItem) => orderItem.option)
  orders: OrderItemModel;

  public getPrice(): number {
    return Math.round(this.price * (1 - (this.discountPercentage / 100)));
  }

  public getPublicMerchItemOption(): PublicMerchItemOption {
    const option: PublicMerchItemOption = {
      uuid: this.uuid,
      price: this.price,
      discountPercentage: this.discountPercentage,
      metadata: this.metadata,
      quantity: this.quantity,
    };
    return option;
  }

  public getPublicOrderMerchItemOption(): PublicOrderMerchItemOption {
    return {
      uuid: this.uuid,
      price: this.price,
      discountPercentage: this.discountPercentage,
      metadata: this.metadata,
      item: this.item?.getPublicOrderMerchItem(),
    };
  }
}
