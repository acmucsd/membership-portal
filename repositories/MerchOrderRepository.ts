import { EntityRepository } from 'typeorm';
import { Uuid } from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { OrderItemModel } from '../models/OrderItemModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(OrderModel)
export class MerchOrderRepository extends BaseRepository<OrderModel> {
  public async createMerchOrder(order: OrderModel): Promise<OrderModel> {
    return this.repository.save(order);
  }

  public async findByUuid(uuid: Uuid): Promise<OrderModel> {
    return this.repository.findOne(uuid);
  }

  public async getAllOrdersForAllUsers(): Promise<OrderModel[]> {
    return this.repository.find();
  }

  public async getAllOrdersForUser(user: UserModel): Promise<OrderModel[]> {
    return this.repository.find({ user });
  }
}

@EntityRepository(OrderItemModel)
export class OrderItemRepository extends BaseRepository<OrderItemModel> {
  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, OrderItemModel>> {
    const items = await this.repository.findByIds(uuids);
    return new Map(items.map((i) => [i.uuid, i]));
  }

  public async fulfillOrderItem(orderItem: OrderItemModel, fulfilled?: boolean, notes?: string) {
    if (fulfilled) {
      orderItem.fulfilled = true;
      orderItem.fulfilledAt = new Date();
    }
    if (notes) orderItem.notes = notes;
    return this.repository.save(orderItem);
  }

  public async hasCollectionBeenOrderedFrom(collection: Uuid): Promise<boolean> {
    const count = await this.repository.createQueryBuilder('item')
      .innerJoinAndSelect('item.item', 'merch')
      .where('merch.collection = :collection', { collection })
      .getCount();
    return count > 0;
  }

  public async hasItemBeenOrdered(item: Uuid): Promise<boolean> {
    const count = await this.repository.count({ where: { item } });
    return count > 0;
  }
}
