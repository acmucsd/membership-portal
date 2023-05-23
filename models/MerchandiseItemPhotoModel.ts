import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Uuid } from '../types';
import { MerchandiseItemModel } from './MerchandiseItemModel';
import { integer } from 'aws-sdk/clients/cloudfront';

@Entity('MerchandiseItemPhotos')
export class MerchandiseItemPhotoModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => MerchandiseItemModel, (merchItem) => merchItem.uuid, { nullable: false })
  @JoinColumn({ name: 'merchItem' })
  @Index('images_by_item_index')
  merchItem: MerchandiseItemModel;

  @Column('varchar', { length: 255, nullable: false })
  picture: string;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  uploadedAt: Date;

  @Column('integer')
  position: number;

}
