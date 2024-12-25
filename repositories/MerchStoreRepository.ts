import { DataSource, SelectQueryBuilder } from 'typeorm';
import Container from 'typedi';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import { MerchandiseItemPhotoModel } from '../models/MerchandiseItemPhotoModel';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { MerchCollectionPhotoModel } from '../models/MerchCollectionPhotoModel';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { Uuid } from '../types';

export const MerchCollectionRepository = Container.get(DataSource)
  .getRepository(MerchandiseCollectionModel)
  .extend({
    async findByUuid(uuid: Uuid): Promise<MerchandiseCollectionModel> {
      return this.getBaseFindManyQuery()
        .where({ uuid })
        .getOne();
    },

    async getAllCollections(): Promise<MerchandiseCollectionModel[]> {
      return this.getBaseFindManyQuery()
        .orderBy('collection.createdAt', 'DESC')
        .getMany();
    },

    async getAllActiveCollections(): Promise<MerchandiseCollectionModel[]> {
      return this.getBaseFindManyQuery()
        .where({ archived: false })
        .orderBy('collection.createdAt', 'DESC')
        .getMany();
    },

    async upsertMerchCollection(collection: MerchandiseCollectionModel,
      changes?: Partial<MerchandiseCollectionModel>): Promise<MerchandiseCollectionModel> {
      if (changes) collection = this.repository.merge(collection, changes) as MerchandiseCollectionModel;
      return this.repository.save(collection);
    },

    async deleteMerchCollection(collection: MerchandiseCollectionModel): Promise<void> {
      await this.repository.remove(collection);
    },

    getBaseFindManyQuery(): SelectQueryBuilder<MerchandiseCollectionModel> {
      return this.repository.createQueryBuilder('collection')
        .leftJoinAndSelect('collection.items', 'items')
        .leftJoinAndSelect('collection.collectionPhotos', 'collectionPhotos')
        .leftJoinAndSelect('items.options', 'options')
        .leftJoinAndSelect('items.merchPhotos', 'merchPhotos');
    },
  });

export const MerchCollectionPhotoRepository = Container.get(DataSource)
  .getRepository(MerchCollectionPhotoModel)
  .extend({
    async findByUuid(uuid: Uuid): Promise<MerchCollectionPhotoModel> {
      return this.repository.findOne(uuid, { relations: ['merchCollection'] });
    },

    async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchCollectionPhotoModel>> {
      const photos = await this.repository.findByIds(uuids, { relations: ['merchCollection'] });
      return new Map(photos.map((o) => [o.uuid, o]));
    },

    async upsertCollectionPhoto(photo: MerchCollectionPhotoModel,
      changes?: Partial<MerchCollectionPhotoModel>): Promise<MerchCollectionPhotoModel> {
      if (changes) photo = this.repository.merge(photo, changes) as MerchCollectionPhotoModel;
      return this.repository.save(photo);
    },

    async deleteCollectionPhoto(photo: MerchCollectionPhotoModel): Promise<void> {
      await this.repository.remove(photo);
    },
  });

export const MerchItemRepository = Container.get(DataSource)
  .getRepository(MerchandiseItemModel)
  .extend({
    async findByUuid(uuid: Uuid): Promise<MerchandiseItemModel> {
      return this.repository.findOne(
        uuid,
        { relations: ['collection', 'options', 'merchPhotos', 'collection.collectionPhotos'] },
      );
    },

    async upsertMerchItem(
      item: MerchandiseItemModel,
      changes?: Partial<MerchandiseItemModel>,
    ):
      Promise<MerchandiseItemModel> {
      if (changes) item = this.repository.merge(item, changes) as MerchandiseItemModel;
      return this.repository.save(item);
    },

    async updateMerchItemsInCollection(collection: string, changes: Partial<MerchandiseItemModel>): Promise<void> {
      const qb = this.repository.createQueryBuilder();

      await qb
        .update()
        .set(changes)
        .where('collection.uuid = :collection')
        .setParameter('collection', collection)
        .execute();
    },

    async deleteMerchItem(item: MerchandiseItemModel) {
      await this.repository.remove(item);
    },
  });

export const MerchItemOptionRepository = Container.get(DataSource)
  .getRepository(MerchandiseItemOptionModel)
  .extend({
    async findByUuid(uuid: Uuid): Promise<MerchandiseItemOptionModel> {
      return this.repository.findOne(uuid, { relations: ['item', 'item.merchPhotos'] });
    },

    async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseItemOptionModel>> {
      const options = await this.repository.findByIds(uuids, { relations: ['item', 'item.merchPhotos'] });
      return new Map(options.map((o) => [o.uuid, o]));
    },

    async upsertMerchItemOption(option: MerchandiseItemOptionModel,
      changes?: Partial<MerchandiseItemOptionModel>): Promise<MerchandiseItemOptionModel> {
      if (changes) option = this.repository.merge(option, changes) as MerchandiseItemOptionModel;
      return this.repository.save(option);
    },

    async updateMerchItemOptionsInCollection(collection: string, discountPercentage: number): Promise<void> {
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
    },

    async deleteMerchItemOption(option: MerchandiseItemOptionModel): Promise<void> {
      await this.repository.remove(option);
    },
  });

export const MerchItemPhotoRepository = Container.get(DataSource)
  .getRepository(MerchandiseItemPhotoModel)
  .extend({
    async findByUuid(uuid: Uuid): Promise<MerchandiseItemPhotoModel> {
      return this.repository.findOne(uuid, { relations: ['merchItem'] });
    },

    async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseItemPhotoModel>> {
      const merchPhotos = await this.repository.findByIds(uuids, { relations: ['merchItem'] });
      return new Map(merchPhotos.map((o) => [o.uuid, o]));
    },

    async upsertMerchItemPhoto(merchPhoto: MerchandiseItemPhotoModel,
      changes?: Partial<MerchandiseItemPhotoModel>): Promise<MerchandiseItemPhotoModel> {
      if (changes) merchPhoto = this.repository.merge(merchPhoto, changes) as MerchandiseItemPhotoModel;
      return this.repository.save(merchPhoto);
    },

    async deleteMerchItemPhoto(merchPhoto: MerchandiseItemPhotoModel): Promise<void> {
      await this.repository.remove(merchPhoto);
    },
  });
