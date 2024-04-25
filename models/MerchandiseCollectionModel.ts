import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn } from 'typeorm';
import { Uuid, PublicMerchCollection } from '@customtypes';
import { MerchandiseItemModel, MerchCollectionPhotoModel } from '@models';

@Entity('MerchandiseCollections')
export class MerchandiseCollectionModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 255 })
  title: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column('varchar', { length: 255 })
  themeColorHex: string;

  @Column('text')
  description: string;

  @Column('boolean', { default: false })
  archived: boolean;

  @OneToMany((type) => MerchandiseItemModel, (item) => item.collection, { cascade: true })
  items: MerchandiseItemModel[];

  @OneToMany((type) => MerchCollectionPhotoModel, (photo) => photo.merchCollection, { cascade: true })
  collectionPhotos: MerchCollectionPhotoModel[];

  public getPublicMerchCollection(canSeeHiddenItems = false): PublicMerchCollection {
    const baseMerchCollection: any = {
      uuid: this.uuid,
      title: this.title,
      collectionPhotos: this.collectionPhotos,
      themeColorHex: this.themeColorHex,
      description: this.description,
      createdAt: this.createdAt,
    };
    if (this.items) {
      baseMerchCollection.items = this.items.map((i) => i.getPublicMerchItem());
      if (!canSeeHiddenItems) {
        baseMerchCollection.items = baseMerchCollection.items.filter((i) => !i.hidden);
      }
    }
    return baseMerchCollection;
  }
}
