import {
  Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { pick } from 'underscore';
import { Uuid, PublicMerchItem } from '../types';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';
import { OrderItemModel } from './OrderItemModel';

@Entity('Merchandise')
export class MerchandiseModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  @Index({ unique: true })
  uuid: Uuid;

  @Column('text')
  itemName: string;

  @ManyToOne((type) => MerchandiseCollectionModel,
    (col) => col.items,
    { nullable: false, eager: true, onDelete: 'CASCADE' })
  @Index('merchandise_collections_index')
  @JoinColumn({ name: 'collection' })
  collection: MerchandiseCollectionModel;

  @Column({ nullable: true })
  picture: string;

  @Column()
  price: number;

  @Column({ default: 0 })
  quantity: number;

  @Column('text')
  description: string;

  @Column({ default: 0 })
  discountPercentage: number;

  @Column({ nullable: true })
  monthlyLimit: number;

  @Column({ nullable: true })
  lifetimeLimit: number;

  @Column({ default: 0 })
  numSold: number;

  @Column({ default: false })
  hidden: boolean;

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

  @OneToMany((type) => OrderItemModel, (orderItem) => orderItem.item)
  orders: OrderItemModel;

  public getPrice(): number {
    return Math.round(this.price * (1 - (this.discountPercentage / 100)));
  }

  public getPublicMerchItem(): PublicMerchItem {
    return pick(this, [
      'uuid',
      'itemName',
      'collection',
      'picture',
      'price',
      'quantity',
      'description',
      'discountPercentage',
      'monthlyLimit',
      'lifetimeLimit',
    ]);
  }
}
