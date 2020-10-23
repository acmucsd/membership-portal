import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Uuid, PublicMerchCollection } from '../types';
import { MerchandiseItemModel } from './MerchandiseItemModel';

@Entity('MerchandiseCollections')
export class MerchandiseCollectionModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: false })
  archived: boolean;

  @OneToMany((type) => MerchandiseItemModel, (item) => item.collection, { cascade: true })
  items: MerchandiseItemModel[];

  public getPublicMerchCollection(): PublicMerchCollection {
    const baseMerchCollection: any = {
      uuid: this.uuid,
      title: this.title,
      description: this.description,
    };
    if (this.items) baseMerchCollection.items = this.items.map((i) => i.getPublicMerchItem());
    return baseMerchCollection;
  }
}
