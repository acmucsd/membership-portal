import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Uuid, PublicMerchCollection } from '../types';
import { MerchandiseItemModel } from './MerchandiseItemModel';

@Entity('MerchandiseCollections')
export class MerchandiseCollectionModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('varchar', { length: 255, nullable: true })
  themeColor: string;

  @Column('text')
  description: string;

  @Column('boolean', { default: false })
  archived: boolean;

  @OneToMany((type) => MerchandiseItemModel, (item) => item.collection, { cascade: true })
  items: MerchandiseItemModel[];

  public getPublicMerchCollection(): PublicMerchCollection {
    const baseMerchCollection: any = {
      uuid: this.uuid,
      title: this.title,
      themeColor: this.themeColor,
      description: this.description,
    };
    if (this.items) baseMerchCollection.items = this.items.map((i) => i.getPublicMerchItem());
    return baseMerchCollection;
  }
}
