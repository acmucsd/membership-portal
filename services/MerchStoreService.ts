import { Service, Inject } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError, ForbiddenError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { difference, flatten, intersection } from 'underscore';
import * as moment from 'moment';
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
  MerchItemOption,
  MerchItemOptionAndQuantity,
  MerchItemEdit,
  PublicMerchItemOption,
  PublicOrderPickupEvent,
  OrderPickupEvent,
  OrderPickupEventEdit,
} from '../types';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import EmailService from './EmailService';
import { UserError } from '../utils/Errors';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';

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
    if (!collection) throw new NotFoundError('Merch collection not found');
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
      if (!currentCollection) throw new NotFoundError('Merch collection not found');
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
      if (!collection) throw new NotFoundError('Merch collection not found');
      const hasBeenOrderedFrom = await Repositories
        .merchOrderItem(txn)
        .hasCollectionBeenOrderedFrom(uuid);
      if (hasBeenOrderedFrom) throw new UserError('This collection has been ordered from and cannot be deleted');
      return merchCollectionRepository.deleteMerchCollection(collection);
    });
  }

  public async findItemByUuid(uuid: Uuid, canSeeFullItem = false): Promise<PublicMerchItem> {
    const item = await this.transactions.readOnly(async (txn) => Repositories
      .merchStoreItem(txn)
      .findByUuid(uuid));
    if (!item) throw new NotFoundError('Merch item not found');
    return item.getPublicMerchItem(canSeeFullItem);
  }

  public async createItem(item: MerchItem): Promise<MerchandiseItemModel> {
    return this.transactions.readWrite(async (txn) => {
      MerchStoreService.verifyItemHasValidOptions(item);

      const collection = await Repositories.merchStoreCollection(txn).findByUuid(item.collection);
      if (!collection) throw new NotFoundError('Merch collection not found');

      const merchItemRepository = Repositories.merchStoreItem(txn);
      const merchItem = MerchandiseItemModel.create({ ...item, collection });
      await merchItemRepository.upsertMerchItem(merchItem);
      return merchItemRepository.findByUuid(merchItem.uuid);
    });
  }

  /**
   * Verify that items have valid options. An item with variants disabled cannot have multiple
   * options, and an item with variants enabled cannot have multiple option types.
   */
  private static verifyItemHasValidOptions(item: MerchItem | MerchandiseItemModel) {
    if (!item.hasVariantsEnabled && item.options.length > 1) {
      throw new UserError('Merch items with variants disabled cannot have multiple options');
    }
    if (item.hasVariantsEnabled && !MerchStoreService.allOptionsHaveValidMetadata(item.options)) {
      throw new UserError('Merch options for items with variants enabled must have valid metadata');
    }
    if (item.hasVariantsEnabled && MerchStoreService.hasMultipleOptionTypes(item.options)) {
      throw new UserError('Merch items cannot have multiple option types');
    }
  }

  private static allOptionsHaveValidMetadata(options: MerchItemOption[]): boolean {
    return options.every((o) => !!o.metadata);
  }

  private static hasMultipleOptionTypes(options: MerchItemOption[]): boolean {
    const optionTypes = new Set(options.map((option) => option.metadata.type));
    return optionTypes.size > 1;
  }

  /**
   * Edits a merch item and its options, given the item edit.
   * Item edits cannot add or remove item options - they can only edit existing options.
   * If the visibility of the item is set to visible, then the item cannot have 0 options.
   * @returns edited item
   */
  public async editItem(uuid: Uuid, itemEdit: MerchItemEdit): Promise<MerchandiseItemModel> {
    return this.transactions.readWrite(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      if (itemEdit.hidden === false && item.options.length === 0) {
        throw new UserError('Item cannot be set to visible if it has 0 options.');
      }

      const { options, collection: updatedCollection, ...changes } = itemEdit;

      if (options) {
        const optionUpdatesByUuid = new Map(options.map((option) => [option.uuid, option]));

        item.options.map((currentOption) => {
          if (!optionUpdatesByUuid.has(currentOption.uuid)) return;
          const optionUpdate = optionUpdatesByUuid.get(currentOption.uuid);
          // 'quantity' is incremented instead of directly set to avoid concurrency issues with orders
          // e.g. there's 10 of an item and someone adds 5 to stock while someone else orders 1
          // so the merch store admin sets quantity to 15 but the true quantity is 14
          if (optionUpdate.quantityToAdd) currentOption.quantity += optionUpdate.quantityToAdd;
          return MerchandiseItemOptionModel.merge(currentOption, optionUpdate);
        });
      }

      const updatedItem = MerchandiseItemModel.merge(item, changes);
      MerchStoreService.verifyItemHasValidOptions(updatedItem);

      if (updatedCollection) {
        const collection = await Repositories
          .merchStoreCollection(txn)
          .findByUuid(updatedCollection);
        if (!collection) throw new NotFoundError('Merch collection not found');
      }

      return merchItemRepository.upsertMerchItem(updatedItem);
    });
  }

  public async deleteItem(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const merchItemRepository = Repositories.merchStoreItem(txn);
      const item = await merchItemRepository.findByUuid(uuid);
      if (!item) throw new NotFoundError();
      const hasBeenOrdered = await Repositories.merchOrderItem(txn).hasItemBeenOrdered(uuid);
      if (hasBeenOrdered) throw new UserError('This item has been ordered and cannot be deleted');
      return merchItemRepository.deleteMerchItem(item);
    });
  }

  /**
   * Creates an item option. An item option can be added to an item if:
   *    - the item has variants enabled and the option has the same type as the existing item options
   *    - the item has variants disabled and has exactly 0 options (only the case if the item is hidden)
   * @param item merch item uuid
   * @param option merch item option
   * @returns created item option
   */
  public async createItemOption(item: Uuid, option: MerchItemOption): Promise<PublicMerchItemOption> {
    return this.transactions.readWrite(async (txn) => {
      const merchItem = await Repositories.merchStoreItem(txn).findByUuid(item);
      if (!merchItem) throw new NotFoundError('Merch item not found');

      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const createdOption = MerchandiseItemOptionModel.create({ ...option, item: merchItem });
      merchItem.options.push(createdOption);
      MerchStoreService.verifyItemHasValidOptions(merchItem);

      const upsertedOption = await merchItemOptionRepository.upsertMerchItemOption(createdOption);
      return upsertedOption.getPublicMerchItemOption();
    });
  }

  /**
   * Deletes the given item option. Deletion will fail if the item option has already been ordered,
   * or if the deletion will result in the item having 0 options while being visible to the public.
   *
   * Note that the item is allowed to have 0 options, but only if the item is hidden.
   * @param uuid option uuid
   */
  public async deleteItemOption(uuid: Uuid): Promise<void> {
    await this.transactions.readWrite(async (txn) => {
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const option = await merchItemOptionRepository.findByUuid(uuid);
      if (!option) throw new NotFoundError();
      const hasBeenOrdered = await Repositories.merchOrderItem(txn).hasOptionBeenOrdered(uuid);
      if (hasBeenOrdered) throw new UserError('This item option has been ordered and cannot be deleted');

      const item = await Repositories.merchStoreItem(txn).findByUuid(option.item.uuid);
      if (item.options.length === 1 && !option.item.hidden) {
        throw new UserError('Cannot delete the only option for a visible merch item');
      }

      return merchItemOptionRepository.deleteMerchItemOption(option);
    });
  }

  public async findOrderByUuid(uuid: Uuid): Promise<PublicOrder> {
    const order = await this.transactions.readOnly(async (txn) => Repositories
      .merchOrder(txn)
      .findByUuid(uuid));
    if (!order) throw new NotFoundError('Merch order not found');
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

  /**
   * Places an order with the list of options and their quantities for the given user.
   *
   * The order is placed if the following conditions are met:
   *    - all the ordered item options exist within the database
   *    - the ordered item options were placed for non-hidden items
   *    - the user wouldn't reach monthly or lifetime limits for any item if this order is placed
   *    - the requested item options are in stock
   *    - the user has enough credits to place the order
   *
   * @param originalOrder the order containing item options and their quantities
   * @param user user placing the order
   * @returns the finalized order, including sale price, discount, and fulfillment details
   */
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
        throw new NotFoundError(`The following items were not found: ${missingItems}`);
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
      if (user.credits < totalCost) throw new UserError('You don\'t have enough credits for this order');

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

  public async getPastPickupEvents(canSeeOrders = false): Promise<PublicOrderPickupEvent[]> {
    const pickupEvents = await this.transactions.readOnly(async (txn) => Repositories
      .merchOrderPickupEvent(txn)
      .getPastPickupEvents());
    return pickupEvents.map((e) => e.getPublicOrderPickupEvent(canSeeOrders));
  }

  public async getFuturePickupEvents(canSeeOrders = false): Promise<PublicOrderPickupEvent[]> {
    const pickupEvents = await this.transactions.readOnly(async (txn) => Repositories
      .merchOrderPickupEvent(txn)
      .getFuturePickupEvents());
    return pickupEvents.map((e) => e.getPublicOrderPickupEvent(canSeeOrders));
  }

  public async createPickupEvent(pickupEvent: OrderPickupEvent): Promise<PublicOrderPickupEvent> {
    return this.transactions.readWrite(async (txn) => {
      if (pickupEvent.start >= pickupEvent.end) {
        throw new UserError('Order pickup event start time must come before the end time');
      }
      const createdPickupEvent = await Repositories.merchOrderPickupEvent(txn)
        .upsertPickupEvent(OrderPickupEventModel.create(pickupEvent));
      return createdPickupEvent.getPublicOrderPickupEvent();
    });
  }

  public async editPickupEvent(uuid: Uuid, changes: OrderPickupEventEdit): Promise<PublicOrderPickupEvent> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      const updatedPickupEvent = OrderPickupEventModel.merge(pickupEvent, changes);
      if (updatedPickupEvent.start >= updatedPickupEvent.end) {
        throw new UserError('Order pickup event start time must come before the end time');
      }
      const upsertedPickupEvent = await orderPickupEventRepository.upsertPickupEvent(updatedPickupEvent);
      return upsertedPickupEvent.getPublicOrderPickupEvent();
    });
  }

  public async deletePickupEvent(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      if (pickupEvent.orders.length > 0) {
        throw new UserError('Cannot delete an order pickup event that has orders assigned to it');
      }
      await orderPickupEventRepository.deletePickupEvent(pickupEvent);
    });
  }
}
