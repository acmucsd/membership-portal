import { EntityRepository } from 'typeorm';
import { Uuid } from '../types';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { MerchandiseModel } from '../models/MerchandiseItemModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(MerchandiseCollectionModel)
export class MerchCollectionRepository extends BaseRepository<MerchandiseCollectionModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseCollectionModel> {
    return this.repository.findOne(uuid, { relations: ['items'] });
  }

  public async getAllCollections(): Promise<MerchandiseCollectionModel[]> {
    return this.repository.find({ relations: ['items'] });
  }

  public async getAllActiveCollections(): Promise<MerchandiseCollectionModel[]> {
    return this.repository.find({
      where: { archived: false },
    });
  }

  public async upsertMerchCollection(collection: MerchandiseCollectionModel,
    changes?: Partial<MerchandiseCollectionModel>): Promise<MerchandiseCollectionModel> {
    if (changes) collection = MerchandiseCollectionModel.merge(collection, changes);
    return this.repository.save(collection);
  }

  public async deleteMerchCollection(collection: MerchandiseCollectionModel): Promise<void> {
    await this.repository.remove(collection);
  }
}

@EntityRepository(MerchandiseModel)
export class MerchItemRepository extends BaseRepository<MerchandiseModel> {
  public async findByUuid(uuid: Uuid): Promise<MerchandiseModel> {
    return this.repository.findOne(uuid);
  }

  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, MerchandiseModel>> {
    const items = await this.repository.findByIds(uuids);
    return new Map(items.map((item) => [item.uuid, item]));
  }

  public async upsertMerchItem(item: MerchandiseModel, changes?: Partial<MerchandiseModel>): Promise<MerchandiseModel> {
    if (changes) item = MerchandiseModel.merge(item, changes);
    return this.repository.save(item);
  }

  public async updateMerchItemsInCollection(collection: Uuid, discountPercentage: number): Promise<void> {
    await this.repository.createQueryBuilder()
      .update()
      .set({ discountPercentage })
      .where({ collection })
      .execute();
  }

  public async deleteMerchItem(item: MerchandiseModel) {
    await this.repository.remove(item);
  }
}
