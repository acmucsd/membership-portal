import {
  Entity, BaseEntity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Uuid, PublicMerchItem } from '../types';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';
import { MerchandiseItemOptionModel } from './MerchandiseItemOptionModel';

@Entity('MerchandiseItems')
export class MerchandiseItemModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('text')
  itemName: string;

  @ManyToOne((type) => MerchandiseCollectionModel,
    (col) => col.items,
    { nullable: false, onDelete: 'CASCADE' })
  @Index('merchandise_collections_index')
  @JoinColumn({ name: 'collection' })
  collection: MerchandiseCollectionModel;

  @Column('varchar', { length: 255, nullable: true })
  picture: string;

  @Column('text')
  description: string;

  @Column('integer', { nullable: true })
  monthlyLimit: number;

  @Column('integer', { nullable: true })
  lifetimeLimit: number;

  @Column('boolean', { default: true })
  hidden: boolean;

  @Column('boolean', { default: false })
  hasVariantsEnabled: boolean;

  @OneToMany((type) => MerchandiseItemOptionModel, (option) => option.item, { cascade: true })
  options: MerchandiseItemOptionModel[];

  public getPublicMerchItem(canSeeOptionQuantities = false): PublicMerchItem {
    const baseMerchItem: PublicMerchItem = {
      uuid: this.uuid,
      itemName: this.itemName,
      picture: this.picture,
      description: this.description,
      options: this.options.map((o) => o.getPublicMerchItemOption(canSeeOptionQuantities)),
      monthlyLimit: this.monthlyLimit,
      lifetimeLimit: this.lifetimeLimit,
      hasVariantsEnabled: this.hasVariantsEnabled,
    };
    if (this.collection) baseMerchItem.collection = this.collection.getPublicMerchCollection();
    return baseMerchItem;
  }
}
