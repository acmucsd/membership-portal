import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import { MerchandiseItemPhotoModel } from '../models/MerchandiseItemPhotoModel';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { MerchCollectionPhotoModel } from '../models/MerchCollectionPhotoModel';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { Uuid } from '../types';
import { BaseRepository } from './BaseRepository';

@EntityRepository(MerchandiseCollectionModel)
export class MerchCollectionRepository extends BaseRepository<MerchandiseCollectionModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseCollectionModel> {
    return this.getBaseFindManyQuery()
      .where({ uuid })
      .getOne();
  }

  public async getAllCollections(): Promise<MerchandiseCollectionModel[]> {
    return this.getBaseFindManyQuery()
      .orderBy('collection.createdAt', 'DESC')
      .getMany();
  }

  public async getAllActiveCollections(): Promise<MerchandiseCollectionModel[]> {
    return this.getBaseFindManyQuery()
      .where({ archived: false })
      .orderBy('collection.createdAt', 'DESC')
      .getMany();
  }

  public async upsertMerchCollection(collection: MerchandiseCollectionModel,
    changes?: Partial<MerchandiseCollectionModel>): Promise<MerchandiseCollectionModel> {
    if (changes) collection = MerchandiseCollectionModel.merge(collection, changes);
    return this.repository.save(collection);
  }

  public async deleteMerchCollection(collection: MerchandiseCollectionModel): Promise<void> {
    await this.repository.remove(collection);
  }

  public getBaseFindManyQuery(): SelectQueryBuilder<MerchandiseCollectionModel> {
    return this.repository.createQueryBuilder('collection')
      .leftJoinAndSelect('collection.items', 'items')
      .leftJoinAndSelect('collection.collectionPhotos', 'collectionPhotos')
      .leftJoinAndSelect('items.options', 'options')
      .leftJoinAndSelect('items.merchPhotos', 'merchPhotos');
  }
}

@EntityRepository(MerchCollectionPhotoModel)
export class MerchCollectionPhotoRepository extends BaseRepository<MerchCollectionPhotoModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchCollectionPhotoModel> {
    return this.repository.findOne(uuid, { relations: ['merchCollection'] });
  }

  // for querying a group of pictures together
  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchCollectionPhotoModel>> {
    const photos = await this.repository.findByIds(uuids, { relations: ['merchCollection'] });
    return new Map(photos.map((o) => [o.uuid, o]));
  }

  public async upsertCollectionPhoto(photo: MerchCollectionPhotoModel,
    changes?: Partial<MerchCollectionPhotoModel>): Promise<MerchCollectionPhotoModel> {
    if (changes) photo = MerchCollectionPhotoModel.merge(photo, changes);
    return this.repository.save(photo);
  }

  public async deleteCollectionPhoto(photo: MerchCollectionPhotoModel): Promise<void> {
    await this.repository.remove(photo);
  }
}

@EntityRepository(MerchandiseItemModel)
export class MerchItemRepository extends BaseRepository<MerchandiseItemModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseItemModel> {
    return this.repository.findOne(uuid, { relations: [
      'collection',
      'options',
      'merchPhotos',
      'collection.collectionPhotos',
    ]});
  }

  public async upsertMerchItem(item: MerchandiseItemModel, changes?: Partial<MerchandiseItemModel>):
  Promise<MerchandiseItemModel> {
    if (changes) item = MerchandiseItemModel.merge(item, changes);
    return this.repository.save(item);
  }

  public async updateMerchItemsInCollection(collection: string, changes: Partial<MerchandiseItemModel>): Promise<void> {
    const qb = this.repository.createQueryBuilder();

    await qb
      .update()
      .set(changes)
      .where('collection.uuid = :collection')
      .setParameter('collection', collection)
      .execute();
  }

  public async deleteMerchItem(item: MerchandiseItemModel) {
    await this.repository.remove(item);
  }
}

@EntityRepository(MerchandiseItemOptionModel)
export class MerchItemOptionRepository extends BaseRepository<MerchandiseItemOptionModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseItemOptionModel> {
    return this.repository.findOne(uuid, { relations: ['item', 'item.merchPhotos'] });
  }

  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseItemOptionModel>> {
    const options = await this.repository.findByIds(uuids, { relations: ['item', 'item.merchPhotos'] });
    return new Map(options.map((o) => [o.uuid, o]));
  }

  public async upsertMerchItemOption(option: MerchandiseItemOptionModel,
    changes?: Partial<MerchandiseItemOptionModel>): Promise<MerchandiseItemOptionModel> {
    if (changes) option = MerchandiseItemOptionModel.merge(option, changes);
    return this.repository.save(option);
  }

  public async updateMerchItemOptionsInCollection(collection: string, discountPercentage: number): Promise<void> {
    const qb = this.repository.createQueryBuilder();
    await qb
      .update()
      .set({ discountPercentage })
      .where(`item IN ${qb.subQuery()
        .select('merch.uuid')
        .from(MerchandiseItemModel, 'merch')
        .where('merch.collection = :collection')
        .getQuery()}`)
      .setParameter('collection', collection)
      .execute();
  }

  public async deleteMerchItemOption(option: MerchandiseItemOptionModel): Promise<void> {
    await this.repository.remove(option);
  }
}

// basically copied from MerchItem
@EntityRepository(MerchandiseItemPhotoModel)
export class MerchItemPhotoRepository extends BaseRepository<MerchandiseItemPhotoModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseItemPhotoModel> {
    return this.repository.findOne(uuid, { relations: ['merchItem'] });
  }

  // for querying a group of photos together
  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseItemPhotoModel>> {
    const merchPhotos = await this.repository.findByIds(uuids, { relations: ['merchItem'] });
    return new Map(merchPhotos.map((o) => [o.uuid, o]));
  }

  public async upsertMerchItemPhoto(merchPhoto: MerchandiseItemPhotoModel,
    changes?: Partial<MerchandiseItemPhotoModel>): Promise<MerchandiseItemPhotoModel> {
    if (changes) merchPhoto = MerchandiseItemPhotoModel.merge(merchPhoto, changes);
    return this.repository.save(merchPhoto);
  }

  public async deleteMerchItemPhoto(merchPhoto: MerchandiseItemPhotoModel): Promise<void> {
    await this.repository.remove(merchPhoto);
  }
}
