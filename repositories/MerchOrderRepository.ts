import { EntityRepository, In, SelectQueryBuilder } from 'typeorm';
import { OrderStatus, Uuid } from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { BaseRepository } from './BaseRepository';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';

@EntityRepository(OrderModel)
export class MerchOrderRepository extends BaseRepository<OrderModel> {
  /**
   * Gets a single order. Returns the order joined with ordered items,
   * user, pickup event, the pickup event's linked event, the ordered items' merch options,
   * and those merch options' merch items.
   *
   * This is the same set of joins that gets executed for OrderPickupEventRepository::findByUuid()
   */
  public async findByUuid(uuid: Uuid): Promise<OrderModel> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.pickupEvent', 'orderPickupEvent')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderItem.option', 'option')
      .leftJoinAndSelect('option.item', 'merchItem')
      .leftJoinAndSelect('merchItem.merchPhotos', 'merchPhotos')
      .leftJoinAndSelect('orderPickupEvent.linkedEvent', 'linkedEvent')
      .where('order.uuid = :uuid', { uuid })
      .getOne();
  }

  /**
   * Gets all orders for all users. Returns the order joined with its pickup event and linked event.
   * Can optionally filter by order status.
   */
  public async getAllOrdersForAllUsers(...statuses: OrderStatus[]): Promise<OrderModel[]> {
    if (statuses.length > 0) {
      return this.repository.find({
        where: {
          status: In(statuses),
        },
      });
    }
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.pickupEvent', 'orderPickupEvent')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderPickupEvent.linkedEvent', 'linkedEvent')
      .getMany();
  }

  /**
   * Gets all orders for a given user. Returns the order joined with its pickup event, linked event, and user.
   */
  public async getAllOrdersForUser(user: UserModel): Promise<OrderModel[]> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.pickupEvent', 'orderPickupEvent')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderPickupEvent.linkedEvent', 'linkedEvent')
      .where('order.user = :uuid', { uuid: user.uuid })
      .getMany();
  }

  /**
   * Gets all orders for a given user. Returns the order joined with its pickup event, user,
   * merch item options, merch items, and merch item photos.
   */
  public async getAllOrdersWithItemsForUser(user: UserModel): Promise<OrderModel[]> {
    return this.repository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.pickupEvent', 'orderPickupEvent')
      .leftJoinAndSelect('order.items', 'orderItem')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderItem.option', 'option')
      .leftJoinAndSelect('option.item', 'merchItem')
      .leftJoinAndSelect('merchItem.merchPhotos', 'merchPhotos')
      .where('order.user = :uuid', { uuid: user.uuid })
      .getMany();
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

  public async getPastItemOrdersByUser(user: UserModel, item: MerchandiseItemModel): Promise<OrderItemModel[]> {
    return this.repository.createQueryBuilder('oi')
      .innerJoinAndSelect('oi.option', 'option')
      .innerJoinAndSelect('oi.order', 'order')
      .innerJoinAndSelect('order.user', 'user')
      .innerJoinAndSelect('option.item', 'item')
      .innerJoinAndSelect('item.merchPhotos', 'merchPhotos')
      .where('item.uuid = :itemUuid', { itemUuid: item.uuid })
      .andWhere('user.uuid = :userUuid', { userUuid: user.uuid })
      .getMany();
  }
}

@EntityRepository(OrderPickupEventModel)
export class OrderPickupEventRepository extends BaseRepository<OrderPickupEventModel> {
  /**
   * Get all past pickup events. Returns the pickup event joined with all the orders for that event.
   */
  public async getPastPickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.getBaseFindManyQuery()
      .where('"orderPickupEvent"."end" < :now')
      .setParameter('now', new Date())
      .getMany();
  }

  /**
   * Get all future pickup events. Returns the pickup event joined with all the orders for that event.
   */
  public async getFuturePickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.getBaseFindManyQuery()
      .where('"orderPickupEvent"."end" >= :now')
      .setParameter('now', new Date())
      .getMany();
  }

  /**
   * Gets a single pickup event. Returns the pickup event joined with all orders,
   * each order's ordered items, the user who placed the order, the pickup event, the ordered items'
   * merch options, and those merch options' merch items.
   *
   * This is the same set of joins that gets executed for MerchOrderRepository::findByUuid()
   */
  public async findByUuid(uuid: Uuid): Promise<OrderPickupEventModel> {
    return this.getBaseFindOneQuery().where({ uuid }).getOne();
  }

  /**
   * Make changes to a single pickup event. Returns the pickup event edited.
   */
  public async upsertPickupEvent(pickupEvent: OrderPickupEventModel, changes?: Partial<OrderPickupEventModel>):
  Promise<OrderPickupEventModel> {
    if (changes) pickupEvent = OrderPickupEventModel.merge(pickupEvent, changes);
    return this.repository.save(pickupEvent);
  }

  public async deletePickupEvent(pickupEvent: OrderPickupEventModel): Promise<OrderPickupEventModel> {
    return this.repository.remove(pickupEvent);
  }

  private getBaseFindOneQuery(): SelectQueryBuilder<OrderPickupEventModel> {
    return this.repository
      .createQueryBuilder('orderPickupEvent')
      .leftJoinAndSelect('orderPickupEvent.orders', 'order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('item.option', 'option')
      .leftJoinAndSelect('option.item', 'merchItem')
      .leftJoinAndSelect('orderPickupEvent.linkedEvent', 'linkedEvent')
      .leftJoinAndSelect('merchItem.merchPhotos', 'merchPhotos');
  }

  private getBaseFindManyQuery(): SelectQueryBuilder<OrderPickupEventModel> {
    return this.repository
      .createQueryBuilder('orderPickupEvent')
      .leftJoinAndSelect('orderPickupEvent.orders', 'order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('orderPickupEvent.linkedEvent', 'linkedEvent');
  }
}
