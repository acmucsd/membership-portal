import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { Uuid, PublicMerchCollection } from '../types';
import { MerchandiseModel } from './MerchandiseItemModel';

@Entity('MerchandiseCollections')
export class MerchandiseCollectionModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  @Index({ unique: true })
  uuid: Uuid;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ default: false })
  archived: boolean;

  @OneToMany((type) => MerchandiseModel, (item) => item.collection, { cascade: true })
  items: MerchandiseModel[];

  public getPublicMerchCollection(): PublicMerchCollection {
    return {
      uuid: this.uuid,
      title: this.title,
      description: this.description,
      items: this.items.map((i) => i.getPublicMerchItem()),
    };
  }
}
