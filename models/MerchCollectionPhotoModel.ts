import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicMerchCollectionPhoto, Uuid } from '../types';
import { MerchandiseCollectionModel } from './MerchandiseCollectionModel';

@Entity('MerchCollectionPhotos')
export class MerchCollectionPhotoModel {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => MerchandiseCollectionModel,
    (merchCollection) => merchCollection.collectionPhotos, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchCollection' })
  @Index('images_by_collection_index')
  merchCollection: MerchandiseCollectionModel;

  @Column('varchar', { length: 255, nullable: false })
  uploadedPhoto: string;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  uploadedAt: Date;

  @Column('integer')
  position: number;

  public getPublicMerchCollectionPhoto(): PublicMerchCollectionPhoto {
    return {
      uuid: this.uuid,
      uploadedPhoto: this.uploadedPhoto,
      uploadedAt: this.uploadedAt,
      position: this.position,
    };
  }
}
