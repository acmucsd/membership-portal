import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { Uuid } from '@acmucsd/membership-portal-types';
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
      .leftJoinAndSelect('items.options', 'options');
  }
}

@EntityRepository(MerchandiseItemModel)
export class MerchItemRepository extends BaseRepository<MerchandiseItemModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseItemModel> {
    return this.repository.findOne(uuid, { relations: ['collection', 'options'] });
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
    return this.repository.findOne(uuid, { relations: ['item'] });
  }

  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseItemOptionModel>> {
    const options = await this.repository.findByIds(uuids, { relations: ['item'] });
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
