import { Service, Inject } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError, ForbiddenError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { difference, flatten, intersection } from 'underscore';
import * as moment from 'moment';
import {
  Uuid,
  PublicMerchCollection,
  PublicMerchItem,
  CreateMerchCollectionRequest,
  CreateMerchItemRequest,
  EditMerchItemRequest,
  EditMerchCollectionRequest,
  PublicOrder,
  ActivityType,
  OrderItemFulfillmentUpdate,
} from '../types';
import { MerchandiseModel } from '../models/MerchandiseItemModel';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { MerchItemAndQuantity } from '../api/validators/MerchStoreRequests';
import Repositories from '../repositories';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import EmailService from './EmailService';
import { UserError } from '../utils/Errors';

@Service()
export default class MerchStoreService {
  @Inject()
  emailService: EmailService;

  @InjectManager()
  private entityManager: EntityManager;

  public async findCollectionByUuid(uuid: Uuid, canSeeSeeHiddenItems = false): Promise<PublicMerchCollection> {
    const collection = await this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      return merchCollectionRepository.findByUuid(uuid);
    });
    if (!collection) throw new NotFoundError();
    if (collection.archived && !canSeeSeeHiddenItems) throw new ForbiddenError();
    return canSeeSeeHiddenItems ? collection.getPublicMerchCollection() : collection;
  }

  public async getAllCollections(canSeeInactiveCollections = false): Promise<PublicMerchCollection[]> {
    return this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      if (canSeeInactiveCollections) {
        const collections = await merchCollectionRepository.getAllCollections();
        return collections;
      }
      const collections = await merchCollectionRepository.getAllActiveCollections();
      return collections.map((c) => c.getPublicMerchCollection());
    });
  }

  public async createCollection(createCollectionRequest: CreateMerchCollectionRequest): Promise<PublicMerchCollection> {
    return this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const collection = MerchandiseCollectionModel.create(createCollectionRequest);
      return merchCollectionRepository.upsertMerchCollection(collection);
    });
  }

  public async editCollection(uuid: Uuid, changes: EditMerchCollectionRequest): Promise<PublicMerchCollection> {
    return this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const currentCollection = await merchCollectionRepository.findByUuid(uuid);
      if (!currentCollection) throw new NotFoundError();
      let updatedCollection = await merchCollectionRepository.upsertMerchCollection(currentCollection, changes);
      if (changes.discountPercentage) {
        const { discountPercentage } = changes;
        const merchItemRepository = Repositories.merchStoreItem(txn);
        await merchItemRepository.updateMerchItemsInCollection(uuid, discountPercentage);
        updatedCollection = await merchCollectionRepository.findByUuid(uuid);
      }
      return updatedCollection;
    });
  }

  public async deleteCollection(uuid: Uuid): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const collection = await merchCollectionRepository.findByUuid(uuid);
      if (!collection) throw new NotFoundError();
      const orderItemRepository = Repositories.merchOrderItem(txn);
      const hasBeenOrderedFrom = await orderItemRepository.hasCollectionBeenOrderedFrom(uuid);
      if (hasBeenOrderedFrom) throw new UserError('This collection has been ordered from');
      return merchCollectionRepository.deleteMerchCollection(collection);
    });
  }

  public async findItemByUuid(uuid: Uuid): Promise<PublicMerchItem> {
    const item = await this.entityManager.transaction(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      return merchItemRepository.findByUuid(uuid);
    });
    if (!item) throw new NotFoundError();
    return item.getPublicMerchItem();
  }

  public async createItem(createItemRequest: CreateMerchItemRequest): Promise<MerchandiseModel> {
    return this.entityManager.transaction(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const collection = await merchCollectionRepository.findByUuid(createItemRequest.collection);
      if (!collection) throw new NotFoundError();
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = MerchandiseModel.create({ ...createItemRequest, collection });
      return merchItemRepository.upsertMerchItem(item);
    });
  }

  public async editItem(uuid: Uuid, editItemRequest: EditMerchItemRequest): Promise<MerchandiseModel> {
    const updatedItem = await this.entityManager.transaction(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      const changes = { ...editItemRequest, collection: item.collection };
      if (changes.collection) {
        const merchCollectionRepository = Repositories.merchStoreCollection(txn);
        const collection = await merchCollectionRepository.findByUuid(editItemRequest.collection);
        if (!collection) throw new NotFoundError('Collection not found');
        changes.collection = collection;
      }
      // 'quantity' is incremented instead of directly set to avoid concurrency issues with orders
      // e.g. there's 10 of an item and someone adds 5 to stock while someone else orders 1
      // so the merch store admin sets quantity to 15 but the true quantity is 14
      if (changes.quantity) changes.quantity += item.quantity;
      return merchItemRepository.upsertMerchItem(item, changes);
    });
    delete updatedItem.collection.items;
    return updatedItem;
  }

  public async deleteItem(uuid: Uuid): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      const hasBeenOrdered = await Repositories.merchOrderItem(txn).hasItemBeenOrdered(uuid);
      if (hasBeenOrdered) throw new UserError('This item has been ordered already');
      return merchItemRepository.deleteMerchItem(item);
    });
  }

  public async findOrderByUuid(uuid: Uuid): Promise<PublicOrder> {
    const order = await this.entityManager.transaction(async (txn) => {
      const merchOrderRepository = Repositories.merchOrder(txn);
      return merchOrderRepository.findByUuid(uuid);
    });
    if (!order) throw new NotFoundError();
    return order.getPublicOrder();
  }

  public async getAllOrders(user: UserModel, canSeeAllOrders = false): Promise<PublicOrder[]> {
    const orders = await this.entityManager.transaction(async (txn) => {
      const merchOrderRepository = Repositories.merchOrder(txn);
      if (canSeeAllOrders) {
        return merchOrderRepository.getAllOrdersForAllUsers();
      }
      return merchOrderRepository.getAllOrdersForUser(user);
    });
    return orders.map((o) => o.getPublicOrder());
  }

  public async placeOrder(originalOrder: MerchItemAndQuantity[], user: UserModel): Promise<PublicOrder> {
    const [order, merchItems] = await this.entityManager.transaction('SERIALIZABLE', async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const items = await merchItemRepository.batchFindByUuid(originalOrder.map((oi) => oi.item));
      if (items.size !== originalOrder.length) {
        const requestedItems = originalOrder.map((oi) => oi.item);
        const foundItems = Array.from(items.values())
          .filter((i) => !i.hidden)
          .map((i) => i.uuid);
        const missingItems = difference(requestedItems, foundItems);
        throw new NotFoundError(`Missing: ${missingItems}`);
      }

      // checks that the user hasn't exceeded monthly/lifetime purchase limits
      const merchOrderRepository = Repositories.merchOrder(txn);
      const lifetimePurchaseHistory = await merchOrderRepository.getAllOrdersForUser(user);
      const oneMonthAgo = new Date(moment().subtract('months', 1).unix());
      const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((o) => o.orderedAt > oneMonthAgo);
      const lifetimeOrderItemCounts = MerchStoreService
        .countOrderItems(Array.from(items.values()), lifetimePurchaseHistory);
      const pastMonthOrderItemCounts = MerchStoreService
        .countOrderItems(Array.from(items.values()), pastMonthPurchaseHistory);
      for (let i = 0; i < originalOrder.length; i += 1) {
        const item = items.get(originalOrder[i].item);
        const quantityRequested = originalOrder[i].quantity;
        if (!!item.lifetimeLimit && lifetimeOrderItemCounts[item.uuid] + quantityRequested > item.lifetimeLimit) {
          throw new UserError(`This order exceeds the lifetime limit for ${item.itemName}`);
        }
        if (!!item.monthlyLimit && pastMonthOrderItemCounts[item.uuid] + quantityRequested > item.monthlyLimit) {
          throw new UserError(`This order exceeds the monthly limit for ${item.itemName}`);
        }
      }

      // checks that enough units of requested items are in stock
      for (let i = 0; i < originalOrder.length; i += 1) {
        const item = items.get(originalOrder[i].item);
        const quantityRequested = originalOrder[i].quantity;
        if (item.quantity < quantityRequested) {
          throw new UserError(`There aren't enough units of ${item.itemName} in stock`);
        }
      }

      // checks that the user has enough credits to place order
      const totalCost = originalOrder.reduce((sum, i) => {
        const item = items.get(i.item);
        const quantityRequested = i.quantity;
        return sum + (item.getPrice() * quantityRequested);
      }, 0);
      await user.reload();
      if (user.credits < totalCost) throw new UserError('You don\'t have enough credits');

      // if all checks pass, the order is placed
      const createdOrder = await merchOrderRepository.createMerchOrder(OrderModel.create({
        user,
        totalCost,
        items: flatten(originalOrder.map((oi) => {
          const item = items.get(oi.item);
          const quantityRequested = oi.quantity;
          return Array(quantityRequested).fill({
            item,
            salePriceAtPurchase: item.getPrice(),
            discountPercentageAtPurchase: item.discountPercentage,
          });
        })),
      }));

      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(user, ActivityType.ORDER_MERCHANDISE, 0, `Order ${createdOrder.uuid}`);

      await Promise.all(originalOrder.map((oi) => {
        const item = items.get(oi.item);
        return merchItemRepository.upsertMerchItem(item, { quantity: item.quantity - oi.quantity });
      }));

      const userRepository = Repositories.user(txn);
      userRepository.upsertUser(user, { credits: user.credits - totalCost });

      return [createdOrder, items];
    });

    const orderConfirmation = {
      items: originalOrder.map((oi) => {
        const item = merchItems.get(oi.item);
        return {
          ...item,
          quantityRequested: oi.quantity,
          salePrice: item.getPrice(),
          total: oi.quantity * item.getPrice(),
        };
      }),
      totalCost: order.totalCost,
    };
    this.emailService.sendOrderConfirmation(user.email, user.firstName, orderConfirmation);

    return order.getPublicOrder();
  }

  public async updateOrderItems(fulfillmentUpdates: OrderItemFulfillmentUpdate[]): Promise<void> {
    const updates = new Map<string, OrderItemFulfillmentUpdate>();
    for (let i = 0; i < fulfillmentUpdates.length; i += 1) {
      const oi = fulfillmentUpdates[i];
      oi.fulfilled = Boolean(oi.fulfilled);
      updates.set(oi.uuid, oi);
    }
    await this.entityManager.transaction('SERIALIZABLE', async (txn) => {
      const orderItemRepository = Repositories.merchOrderItem(txn);
      const orderItems = await orderItemRepository.batchFindByUuid(Array.from(fulfillmentUpdates.map((oi) => oi.uuid)));
      if (orderItems.size !== fulfillmentUpdates.length) {
        throw new NotFoundError('Missing some order items');
      }

      const toBeFulfilled = fulfillmentUpdates
        .filter((oi) => oi.fulfilled)
        .map((oi) => oi.uuid);
      const alreadyFulfilled = Array.from(orderItems.values())
        .filter((oi) => oi.fulfilled)
        .map((oi) => oi.uuid);
      if (intersection(toBeFulfilled, alreadyFulfilled).length > 0) {
        throw new UserError('At least one order item marked to be fulfilled has already been fulfilled');
      }

      await Promise.all(Array.from(orderItems.values()).map((oi) => {
        const { fulfilled, notes } = updates.get(oi.uuid);
        return orderItemRepository.fulfillOrderItem(oi, fulfilled, notes);
      }));
    });
  }

  private static countOrderItems(items: MerchandiseModel[], orders: OrderModel[]): Map<string, number> {
    const counts = new Map();
    for (let i = 0; i < items.length; i += 1) {
      counts.set(items[i].uuid, 0);
    }
    const orderedItems = flatten(orders.map((o) => o.items));
    for (let i = 0; i < orderedItems.length; i += 1) {
      const oi = orderedItems[i].item.uuid;
      if (counts.has(oi)) counts.set(oi, counts.get(oi) + 1);
    }
    return counts;
  }
}
