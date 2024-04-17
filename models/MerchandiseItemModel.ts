import {
  Entity, BaseEntity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Uuid, PublicMerchItem, PublicCartMerchItem } from '../types';
import { MerchandiseCollectionModel, MerchandiseItemOptionModel, MerchandiseItemPhotoModel } from '.';

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

  @OneToMany((type) => MerchandiseItemPhotoModel, (merchPhoto) => merchPhoto.merchItem, { cascade: true })
  merchPhotos: MerchandiseItemPhotoModel[];

  @OneToMany((type) => MerchandiseItemOptionModel, (option) => option.item, { cascade: true })
  options: MerchandiseItemOptionModel[];

  public getPublicMerchItem(): PublicMerchItem {
    const baseMerchItem: PublicMerchItem = {
      uuid: this.uuid,
      itemName: this.itemName,
      merchPhotos: this.merchPhotos.map((o) => o.getPublicMerchItemPhoto()).sort((a, b) => a.position - b.position),
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
      uploadedPhoto: this.getDefaultPhotoUrl(),
      description: this.description,
    };
  }

  // get the first index of photo if possible
  public getDefaultPhotoUrl(): string {
    if (this.merchPhotos.length === 0) return null;
    return this.merchPhotos.reduce(
      (min, current) => ((min.position < current.position) ? min : current),
      this.merchPhotos[0],
    ).uploadedPhoto;
  }
}
