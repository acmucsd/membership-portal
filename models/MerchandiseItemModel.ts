import {
  Entity, BaseEntity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Uuid, PublicMerchItem, PublicCartMerchItem } from '../types';
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

  // copied from AttendanceModel
  // can be empty, default picture is null
  @Column({
    type: 'varchar',
    transformer: {
      to(value: string[]) {
        return JSON.stringify(value);
      },
      from(value: string) {
        return JSON.parse(value);
      },
    },
    nullable: true,
  })
  pictures: string[];

  @OneToMany((type) => MerchandiseItemOptionModel, (option) => option.item, { cascade: true })
  options: MerchandiseItemOptionModel[];

  public getPublicMerchItem(): PublicMerchItem {
    const baseMerchItem: PublicMerchItem = {
      uuid: this.uuid,
      itemName: this.itemName,
      pictures: this.pictures,
      description: this.description,
      options: this.options.map((o) => o.getPublicMerchItemOption()),
      monthlyLimit: this.monthlyLimit,
      lifetimeLimit: this.lifetimeLimit,
      hidden: this.hidden,
      hasVariantsEnabled: this.hasVariantsEnabled,
    };
    if (this.collection) baseMerchItem.collection = this.collection.getPublicMerchCollection();
    return baseMerchItem;
  }

  public getPublicOrderMerchItem(): PublicCartMerchItem {
    return {
      uuid: this.uuid,
      itemName: this.itemName,
      picture: this.getDefaultPicture(),
      description: this.description,
    };
  }

  public getDefaultPicture(): string {
    return this.pictures.length > 0 ? this.pictures[0] : null;
  }
}
