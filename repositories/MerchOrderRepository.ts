import { EntityRepository } from 'typeorm';
import { Uuid } from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { OrderItemModel } from '../models/OrderItemModel';
import { BaseRepository } from './BaseRepository';
import { OrderStatus } from 'types/Enums';

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

  public async fulfillOrder(order:OrderModel): Promise<OrderModel> {
    if(order.status != OrderStatus.FULFILLED){
      let fulfilled = true;
      order.items.forEach(item => {
        if(!item.fulfilled){
          fulfilled = false;
        }
      });
      
      if(fulfilled){
        order.status = OrderStatus.FULFILLED;
        return this.repository.save(order);
      }
      
    }
    return order;
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
