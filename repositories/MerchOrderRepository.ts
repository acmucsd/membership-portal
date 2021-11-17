import { EntityRepository, SelectQueryBuilder } from 'typeorm';
import { OrderStatus, Uuid } from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(OrderModel)
export class MerchOrderRepository extends BaseRepository<OrderModel> {
  public async findByUuid(uuid: Uuid): Promise<OrderModel> {
    return this.repository.findOne(uuid);
  }

  public async getAllOrdersForAllUsers(status?: OrderStatus): Promise<OrderModel[]> {
    if (status) {
      return this.repository.find({ status });
    }
    return this.repository.find();
  }

  public async getAllOrdersForUser(user: UserModel, status?: OrderStatus): Promise<OrderModel[]> {
    if (status) {
      return this.repository.find({ user, status });
    }
    return this.repository.find({ user });
  }

  public async upsertMerchOrder(order: OrderModel, changes?: Partial<OrderModel>): Promise<OrderModel> {
    if (changes) order = OrderModel.merge(order, changes);
    return this.repository.save(order);
  }
}

@EntityRepository(OrderItemModel)
export class OrderItemRepository extends BaseRepository<OrderItemModel> {
  public async batchFindByUuid(uuids: Uuid[]): Promise<Map<Uuid, OrderItemModel>> {
    const items = await this.repository.findByIds(uuids);
    return new Map(items.map((i) => [i.uuid, i]));
  }

  public async fulfillOrderItem(orderItem: OrderItemModel, notes?: string) {
    orderItem.fulfilled = true;
    orderItem.fulfilledAt = new Date();
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
  public async getPastPickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.getBaseFindQuery()
      .where('"end" < :now')
      .setParameter('now', new Date())
      .getMany();
  }

  public async getFuturePickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.getBaseFindQuery()
      .where('"end" >= :now')
      .setParameter('now', new Date())
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
      .leftJoinAndSelect('orderPickupEvent.orders', 'order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('item.option', 'option');
  }
}
