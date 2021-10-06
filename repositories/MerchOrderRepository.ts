import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { Uuid } from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
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
      .innerJoinAndSelect('item.option', 'option')
      .innerJoin('option.item', 'merch')
      .where('merch.collection = :collection', { collection })
      .getCount();
    return count > 0;
  }

  public async hasItemBeenOrdered(item: Uuid): Promise<boolean> {
    const count = await this.repository.createQueryBuilder('oi')
      .innerJoinAndSelect('oi.option', 'option')
      .where('option.item = :item', { item })
      .getCount();
    return count > 0;
  }

  public async hasOptionBeenOrdered(option: Uuid): Promise<boolean> {
    const count = await this.repository.count({ where: { option } });
    return count > 0;
  }
}

@EntityRepository(OrderPickupEventModel)
export class OrderPickupEventRepository extends BaseRepository<OrderPickupEventModel> {
  public async getFuturePickupEvents(): Promise<OrderPickupEventModel[]> {
    const currentOrderCount = await this.repository.createQueryBuilder('orderPickupEvent')
      .innerJoinAndSelect('orderPickupEvent.orders', 'orders')
      .getCount();
    return this.getBaseFindQuery()
      .where('"end" >= :now')
      .andWhere(':orderCount <= "orderLimit"')
      .setParameter('now', new Date())
      .setParameter('orderCount', currentOrderCount)
      .getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<OrderPickupEventModel> {
    return this.getBaseFindQuery().where({ uuid }).getOne();
  }

  public async upsertPickupEvent(pickupEvent: OrderPickupEventModel): Promise<OrderPickupEventModel> {
    return this.repository.save(pickupEvent);
  }

  public async deletePickupEvent(pickupEvent: OrderPickupEventModel): Promise<OrderPickupEventModel> {
    return this.repository.remove(pickupEvent);
  }

  private getBaseFindQuery(): SelectQueryBuilder<OrderPickupEventModel> {
    return this.repository
      .createQueryBuilder('orderPickupEvent')
      .leftJoinAndSelect('orderPickupEvent.orders', 'orders');
  }
}
