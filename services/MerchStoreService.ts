import { Service, Inject } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError, ForbiddenError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { difference, flatten, intersection } from 'underscore';
import * as moment from 'moment';
import { MerchItemOption } from '../api/validators/MerchStoreRequests';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import {
  Uuid,
  PublicMerchCollection,
  PublicMerchItem,
  PublicOrder,
  ActivityType,
  OrderItemFulfillmentUpdate,
  MerchCollection,
  MerchCollectionEdit,
  MerchItem,
  MerchItemOptionAndQuantity,
  MerchItemEdit,
  PublicMerchItemOption,
} from '../types';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import EmailService from './EmailService';
import { UserError } from '../utils/Errors';
import { OrderItemModel } from '../models/OrderItemModel';

@Service()
export default class MerchStoreService {
  @Inject()
  private emailService: EmailService;

  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async findCollectionByUuid(uuid: Uuid, canSeeSeeHiddenItems = false): Promise<PublicMerchCollection> {
    const collection = await this.transactions.readOnly(async (txn) => Repositories
      .merchStoreCollection(txn)
      .findByUuid(uuid));
    if (!collection) throw new NotFoundError('Collection not found');
    if (collection.archived && !canSeeSeeHiddenItems) throw new ForbiddenError();
    return canSeeSeeHiddenItems ? collection : collection.getPublicMerchCollection();
  }

  public async getAllCollections(canSeeInactiveCollections = false): Promise<PublicMerchCollection[]> {
    return this.transactions.readOnly(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      if (canSeeInactiveCollections) {
        return merchCollectionRepository.getAllCollections();
      }
      const collections = await merchCollectionRepository.getAllActiveCollections();
      return collections.map((c) => c.getPublicMerchCollection());
    });
  }

  public async createCollection(collection: MerchCollection): Promise<PublicMerchCollection> {
    return this.transactions.readWrite(async (txn) => Repositories
      .merchStoreCollection(txn)
      .upsertMerchCollection(MerchandiseCollectionModel.create(collection)));
  }

  public async editCollection(uuid: Uuid, changes: MerchCollectionEdit): Promise<PublicMerchCollection> {
    return this.transactions.readWrite(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const currentCollection = await merchCollectionRepository.findByUuid(uuid);
      if (!currentCollection) throw new NotFoundError('Collection not found');
      let updatedCollection = await merchCollectionRepository.upsertMerchCollection(currentCollection, changes);
      if (changes.discountPercentage !== undefined) {
        const { discountPercentage } = changes;
        await Repositories
          .merchStoreItemOption(txn)
          .updateMerchItemOptionsInCollection(uuid, discountPercentage);
      }
      if (changes.archived !== undefined) {
        await Repositories
          .merchStoreItem(txn)
          .updateMerchItemsInCollection(uuid, { hidden: changes.archived });
      }
      if (changes.discountPercentage !== undefined || changes.archived !== undefined) {
        updatedCollection = await merchCollectionRepository.findByUuid(uuid);
      }
      return updatedCollection;
    });
  }

  public async deleteCollection(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const collection = await merchCollectionRepository.findByUuid(uuid);
      if (!collection) throw new NotFoundError('Collection not found');
      const hasBeenOrderedFrom = await Repositories
        .merchOrderItem(txn)
        .hasCollectionBeenOrderedFrom(uuid);
      if (hasBeenOrderedFrom) throw new UserError('This collection has been ordered from');
      return merchCollectionRepository.deleteMerchCollection(collection);
    });
  }

  public async findItemByUuid(uuid: Uuid): Promise<PublicMerchItem> {
    const item = await this.transactions.readOnly(async (txn) => Repositories
      .merchStoreItem(txn)
      .findByUuid(uuid));
    if (!item) throw new NotFoundError('Item not found');
    return item.getPublicMerchItem();
  }

  public async createItem(item: MerchItem): Promise<MerchandiseItemModel> {
    return this.transactions.readWrite(async (txn) => {
      const collection = await Repositories.merchStoreCollection(txn).findByUuid(item.collection);
      if (!collection) throw new NotFoundError('Collection not found');
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const merchItem = MerchandiseItemModel.create({ ...item, collection });
      await merchItemRepository.upsertMerchItem(merchItem);
      return merchItemRepository.findByUuid(merchItem.uuid);
    });
  }

  public async editItem(uuid: Uuid, itemEdit: MerchItemEdit): Promise<MerchandiseItemModel> {
    return this.transactions.readWrite(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      const { options, collection: updatedCollection, ...changes } = itemEdit;

      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const updatedOptions = await Promise.all(options.map(async (optionUpdate) => {
        const option = await merchItemOptionRepository.findByUuid(optionUpdate.uuid);
        if (!option) throw new NotFoundError('Item option not found');
        // 'quantity' is incremented instead of directly set to avoid concurrency issues with orders
        // e.g. there's 10 of an item and someone adds 5 to stock while someone else orders 1
        // so the merch store admin sets quantity to 15 but the true quantity is 14
        if (optionUpdate.quantity) optionUpdate.quantity += option.quantity;
        return merchItemOptionRepository.upsertMerchItemOption(option, optionUpdate);
      }));

      const updatedOptionsIds = new Set(updatedOptions.map((option) => option.uuid));
      item.options = [...updatedOptions, ...item.options.filter((option) => !updatedOptionsIds.has(option.uuid))];

      if (updatedCollection) {
        const collection = await Repositories
          .merchStoreCollection(txn)
          .findByUuid(updatedCollection);
        if (!collection) throw new NotFoundError('Collection not found');
      }

      await merchItemRepository.upsertMerchItem(item, changes);
      return merchItemRepository.findByUuid(uuid);
    });
  }

  public async deleteItem(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      const hasBeenOrdered = await Repositories.merchOrderItem(txn).hasItemBeenOrdered(uuid);
      if (hasBeenOrdered) throw new UserError('This item has been ordered already');
      return merchItemRepository.deleteMerchItem(item);
    });
  }

  public async createItemOption(item: Uuid, option: MerchItemOption): Promise<PublicMerchItemOption> {
    return this.transactions.readWrite(async (txn) => {
      const merchItem = await Repositories.merchStoreItem(txn).findByUuid(item);
      if (!merchItem) throw new NotFoundError('Item not found');
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const createdOption = MerchandiseItemOptionModel.create({ ...option, item: merchItem });
      await merchItemOptionRepository.upsertMerchItemOption(createdOption);
      return merchItemOptionRepository.findByUuid(createdOption.uuid);
    });
  }

  public async deleteItemOption(uuid: Uuid): Promise<void> {
    await this.transactions.readWrite(async (txn) => {
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const option = await merchItemOptionRepository.findByUuid(uuid);
      if (!option) throw new NotFoundError();
      const hasBeenOrdered = await Repositories.merchOrderItem(txn).hasOptionBeenOrdered(uuid);
      if (hasBeenOrdered) throw new UserError('This item option has been ordered already');
      return merchItemOptionRepository.deleteMerchItemOption(option);
    });
  }

  public async findOrderByUuid(uuid: Uuid): Promise<PublicOrder> {
    const order = await this.transactions.readOnly(async (txn) => Repositories
      .merchOrder(txn)
      .findByUuid(uuid));
    if (!order) throw new NotFoundError();
    return order.getPublicOrder();
  }

  public async getAllOrders(user: UserModel, canSeeAllOrders = false): Promise<PublicOrder[]> {
    const orders = await this.transactions.readOnly(async (txn) => {
      const merchOrderRepository = Repositories.merchOrder(txn);
      if (canSeeAllOrders) {
        return merchOrderRepository.getAllOrdersForAllUsers();
      }
      return merchOrderRepository.getAllOrdersForUser(user);
    });
    return orders.map((o) => o.getPublicOrder());
  }

  public async placeOrder(originalOrder: MerchItemOptionAndQuantity[], user: UserModel): Promise<PublicOrder> {
    const [order, merchItemOptions] = await this.transactions.readWrite(async (txn) => {
      await user.reload();
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const itemOptions = await merchItemOptionRepository.batchFindByUuid(originalOrder.map((oi) => oi.option));
      if (itemOptions.size !== originalOrder.length) {
        const requestedItems = originalOrder.map((oi) => oi.option);
        const foundItems = Array.from(itemOptions.values())
          .filter((o) => !o.item.hidden)
          .map((o) => o.uuid);
        const missingItems = difference(requestedItems, foundItems);
        throw new NotFoundError(`Missing: ${missingItems}`);
      }

      // Checks that hidden items were not ordered
      const hiddenItems = Array.from(itemOptions.values())
        .filter((o) => o.item.hidden)
        .map((o) => o.uuid);

      if (hiddenItems.length !== 0) {
        throw new UserError(`Not allowed to order: ${hiddenItems}`);
      }

      // checks that the user hasn't exceeded monthly/lifetime purchase limits
      const merchOrderRepository = Repositories.merchOrder(txn);
      const lifetimePurchaseHistory = await merchOrderRepository.getAllOrdersForUser(user);
      const oneMonthAgo = new Date(moment().subtract('months', 1).unix());
      const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((o) => o.orderedAt > oneMonthAgo);
      const lifetimeItemOrderCounts = MerchStoreService.countItemOrders(itemOptions, lifetimePurchaseHistory);
      const pastMonthItemOrderCounts = MerchStoreService.countItemOrders(itemOptions, pastMonthPurchaseHistory);
      // aggregate requested quantities by item
      const requestedQuantitiesByMerchItem = Array.from(MerchStoreService
        .countItemRequestedQuantities(originalOrder, itemOptions)
        .entries());
      for (let i = 0; i < requestedQuantitiesByMerchItem.length; i += 1) {
        const [item, quantityRequested] = requestedQuantitiesByMerchItem[i];
        if (!!item.lifetimeLimit && lifetimeItemOrderCounts.get(item) + quantityRequested > item.lifetimeLimit) {
          throw new UserError(`This order exceeds the lifetime limit for ${item.itemName}`);
        }
        if (!!item.monthlyLimit && pastMonthItemOrderCounts.get(item) + quantityRequested > item.monthlyLimit) {
          throw new UserError(`This order exceeds the monthly limit for ${item.itemName}`);
        }
      }

      // checks that enough units of requested item options are in stock
      for (let i = 0; i < originalOrder.length; i += 1) {
        const optionAndQuantity = originalOrder[i];
        const option = itemOptions.get(optionAndQuantity.option);
        const quantityRequested = optionAndQuantity.quantity;
        if (option.quantity < quantityRequested) {
          throw new UserError(`There aren't enough units of ${option.item.itemName} in stock`);
        }
      }

      // checks that the user has enough credits to place order
      const totalCost = originalOrder.reduce((sum, o) => {
        const option = itemOptions.get(o.option);
        const quantityRequested = o.quantity;
        return sum + (option.getPrice() * quantityRequested);
      }, 0);
      if (user.credits < totalCost) throw new UserError('You don\'t have enough credits');

      // if all checks pass, the order is placed
      const createdOrder = await merchOrderRepository.createMerchOrder(OrderModel.create({
        user,
        totalCost,
        items: flatten(originalOrder.map((optionAndQuantity) => {
          const option = itemOptions.get(optionAndQuantity.option);
          const quantityRequested = optionAndQuantity.quantity;
          return Array(quantityRequested).fill(OrderItemModel.create({
            option,
            salePriceAtPurchase: option.getPrice(),
            discountPercentageAtPurchase: option.discountPercentage,
          }));
        })),
      }));

      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ORDER_MERCHANDISE,
        description: `Order ${createdOrder.uuid}`,
      });

      await Promise.all(originalOrder.map(async (optionAndQuantity) => {
        const option = itemOptions.get(optionAndQuantity.option);
        const updatedQuantity = option.quantity - optionAndQuantity.quantity;
        return merchItemOptionRepository.upsertMerchItemOption(option, { quantity: updatedQuantity });
      }));

      const userRepository = Repositories.user(txn);
      userRepository.upsertUser(user, { credits: user.credits - totalCost });

      return [createdOrder, itemOptions];
    });

    const orderConfirmation = {
      items: originalOrder.map((oi) => {
        const option = merchItemOptions.get(oi.option);
        const { item } = option;
        return {
          ...item,
          quantityRequested: oi.quantity,
          salePrice: option.getPrice(),
          total: oi.quantity * option.getPrice(),
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
    await this.transactions.readWrite(async (txn) => {
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

  private static countItemOrders(itemOptions: Map<string, MerchandiseItemOptionModel>, orders: OrderModel[]):
  Map<MerchandiseItemModel, number> {
    const counts = new Map<MerchandiseItemModel, number>();
    const options = Array.from(itemOptions.values());
    for (let i = 0; i < options.length; i += 1) {
      counts.set(options[i].item, 0);
    }
    const orderedItemOptions = flatten(orders.map((o) => o.items));
    for (let i = 0; i < orderedItemOptions.length; i += 1) {
      const { item } = itemOptions.get(orderedItemOptions[i].option.uuid);
      if (counts.has(item)) counts.set(item, counts.get(item) + 1);
    }
    return counts;
  }

  private static countItemRequestedQuantities(order: MerchItemOptionAndQuantity[],
    itemOptions: Map<string, MerchandiseItemOptionModel>): Map<MerchandiseItemModel, number> {
    const requestedQuantitiesByMerchItem = new Map<MerchandiseItemModel, number>();
    for (let i = 0; i < order.length; i += 1) {
      const { item } = itemOptions.get(order[i].option);
      const quantityRequested = order[i].quantity;
      if (!requestedQuantitiesByMerchItem.has(item)) requestedQuantitiesByMerchItem.set(item, 0);
      requestedQuantitiesByMerchItem.set(item, requestedQuantitiesByMerchItem.get(item) + quantityRequested);
    }
    return requestedQuantitiesByMerchItem;
  }
}
