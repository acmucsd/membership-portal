import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicMerchCollectionPhoto, Uuid } from '../types';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';

@Entity('MerchCollectionPhotos')
export class MerchCollectionPhotoModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => MerchandiseCollectionModel, (merchCollection) => merchCollection.photos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchCollection' })
  @Index('images_by_collection_index')
  collection: MerchandiseCollectionModel;

  @Column('varchar', { length: 255, nullable: false })
  picture: string;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  uploadedAt: Date;

  @Column('integer')
  position: number;

  public getPublicMerchItemPhoto(): PublicMerchCollectionPhoto {
    return {
      uuid: this.uuid,
      picture: this.picture,
      uploadedAt: this.uploadedAt,
      position: this.position,
    };
  }
}