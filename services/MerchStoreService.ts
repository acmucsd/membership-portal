import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError, ForbiddenError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { difference, flatten, intersection } from 'underscore';
import * as moment from 'moment-timezone';
import { MerchItemWithQuantity, OrderItemPriceAndQuantity } from 'types/internal';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import {
  Uuid,
  PublicMerchCollection,
  ActivityType,
  OrderItemFulfillmentUpdate,
  MerchCollection,
  MerchCollectionEdit,
  MerchItem,
  MerchItemOption,
  MerchItemOptionAndQuantity,
  MerchItemEdit,
  PublicMerchItemOption,
  OrderStatus,
  PublicMerchItemWithPurchaseLimits,
  OrderPickupEventStatus,
  PublicMerchItemPhoto,
  MerchItemPhoto,
  PublicMerchCollectionPhoto,
  MerchCollectionPhoto,
} from '../types';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';
import { MerchCollectionPhotoModel } from '../models/MerchCollectionPhotoModel';
import EmailService from './EmailService';
import { UserError } from '../utils/Errors';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { MerchandiseItemPhotoModel } from '../models/MerchandiseItemPhotoModel';

@Service()
export default class MerchStoreService {
  private static readonly MAX_MERCH_PHOTO_COUNT = 5;

  private static readonly MAX_COLLECTION_PHOTO_COUNT = 5;

  private emailService: EmailService;

  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager, emailService: EmailService) {
    this.transactions = new TransactionsManager(entityManager);
    this.emailService = emailService;
  }

  public async findItemByUuid(uuid: Uuid, user: UserModel): Promise<PublicMerchItemWithPurchaseLimits> {
    return this.transactions.readOnly(async (txn) => {
      const item = await Repositories.merchStoreItem(txn).findByUuid(uuid);

      if (!item) throw new NotFoundError('Merch item not found');

      // calculate monthly and lifetime remaining purchases for this item
      const merchOrderItemRepository = Repositories.merchOrderItem(txn);
      const lifetimePurchaseHistory = await merchOrderItemRepository.getPastItemOrdersByUser(user, item);
      const oneMonthAgo = new Date(moment().subtract(1, 'month').unix());
      const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((oi) => oi.order.orderedAt > oneMonthAgo);
      const lifetimeCancelledItems = lifetimePurchaseHistory
        .filter((oi) => oi.order.status === OrderStatus.CANCELLED);
      const pastMonthCancelledItems = pastMonthPurchaseHistory
        .filter((oi) => oi.order.status === OrderStatus.CANCELLED);
      const lifetimeItemOrderCounts = lifetimePurchaseHistory.length - lifetimeCancelledItems.length;
      const pastMonthItemOrderCounts = pastMonthPurchaseHistory.length - pastMonthCancelledItems.length;

      const monthlyRemaining = item.monthlyLimit - pastMonthItemOrderCounts;
      const lifetimeRemaining = item.lifetimeLimit - lifetimeItemOrderCounts;

      return {
        ...item.getPublicMerchItem(),
        monthlyRemaining,
        lifetimeRemaining,
      };
    });
  }

  public async findCollectionByUuid(uuid: Uuid, canSeeInactiveCollections = false): Promise<PublicMerchCollection> {
    const collection = await this.transactions.readOnly(async (txn) => Repositories
      .merchStoreCollection(txn)
      .findByUuid(uuid));
    if (!collection) throw new NotFoundError('Merch collection not found');
    if (collection.archived && !canSeeInactiveCollections) throw new ForbiddenError();
    collection.collectionPhotos = collection.collectionPhotos.sort((a, b) => a.position - b.position);
    return canSeeInactiveCollections ? collection : collection.getPublicMerchCollection();
  }

  public async getAllCollections(canSeeInactiveCollections = false, canSeeHiddenItems = canSeeInactiveCollections):
  Promise<PublicMerchCollection[]> {
    return this.transactions.readOnly(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      if (canSeeInactiveCollections) {
        return merchCollectionRepository.getAllCollections();
      }
      const collections = await merchCollectionRepository.getAllActiveCollections();
      return collections.map((c) => c.getPublicMerchCollection(canSeeHiddenItems));
    });
  }

  public async createCollection(collection: MerchCollection): Promise<PublicMerchCollection> {
    return this.transactions.readWrite(async (txn) => Repositories
      .merchStoreCollection(txn)
      .upsertMerchCollection(MerchandiseCollectionModel.create(collection)));
  }

  public async editCollection(uuid: Uuid, collectionEdit: MerchCollectionEdit): Promise<PublicMerchCollection> {
    return this.transactions.readWrite(async (txn) => {
      const merchCollectionRepository = Repositories.merchStoreCollection(txn);
      const currentCollection = await merchCollectionRepository.findByUuid(uuid);
      if (!currentCollection) throw new NotFoundError('Merch collection not found');

      const { discountPercentage, collectionPhotos, ...changes } = collectionEdit;

      if (discountPercentage !== undefined) {
        await Repositories
          .merchStoreItemOption(txn)
          .updateMerchItemOptionsInCollection(uuid, discountPercentage);
      }
      if (changes.archived !== undefined) {
        await Repositories
          .merchStoreItem(txn)
          .updateMerchItemsInCollection(uuid, { hidden: changes.archived });
      }

      // this part only handles updating the positions of the pictures
      if (collectionPhotos) {
        // error on duplicate photo uuids
        const dupSet = new Set();
        collectionPhotos.forEach((merchPhoto) => {
          if (dupSet.has(merchPhoto.uuid)) {
            throw new UserError(`Multiple edits is made to photo: ${merchPhoto.uuid}`);
          }
          dupSet.add(merchPhoto.uuid);
        });

        const photoUpdatesByUuid = new Map(collectionPhotos.map((merchPhoto) => [merchPhoto.uuid, merchPhoto]));

        currentCollection.collectionPhotos.map((currentPhoto) => {
          if (!photoUpdatesByUuid.has(currentPhoto.uuid)) return;
          const photoUpdate = photoUpdatesByUuid.get(currentPhoto.uuid);
          return MerchCollectionPhotoModel.merge(currentPhoto, photoUpdate);
        });
      }

      let updatedCollection = await merchCollectionRepository.upsertMerchCollection(currentCollection, changes);

      if (discountPercentage !== undefined || changes.archived !== undefined) {
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

  /**
 * Verify that collections have valid photots.
 */
  private static verifyCollectionHasValidPhotos(collection: MerchCollection | MerchandiseCollectionModel) {
    if (collection.collectionPhotos.length > this.MAX_COLLECTION_PHOTO_COUNT) {
      throw new UserError('Collections cannot have more than 5 pictures');
    }
  }

  /**
   * Creates a collection photo and assign it the corresponding picture url
   * and append the photo to the photos list from merchItem
   * @param collection merch collection uuid
   * @param properties merch collection photo picture url and position
   * @returns created collection photo
  */
  public async createCollectionPhoto(collection: Uuid, properties: MerchCollectionPhoto):
  Promise<PublicMerchCollectionPhoto> {
    return this.transactions.readWrite(async (txn) => {
      const merchCollection = await Repositories.merchStoreCollection(txn).findByUuid(collection);
      if (!merchCollection) throw new NotFoundError('Collection not found');

      const createdPhoto = MerchCollectionPhotoModel.create({ ...properties, merchCollection });
      const merchStoreCollectionPhotoRepository = Repositories.merchStoreCollectionPhoto(txn);

      // verify the result photos array
      merchCollection.collectionPhotos.push(createdPhoto);
      MerchStoreService.verifyCollectionHasValidPhotos(merchCollection);

      const upsertedPhoto = await merchStoreCollectionPhotoRepository.upsertCollectionPhoto(createdPhoto);
      return upsertedPhoto.getPublicMerchCollectionPhoto();
    });
  }

  /**
   * Check if the photo is ready to be deleted. Fail if the merch item is visible
   * and it was the only photo of the item.
   *
   * @param uuid the uuid of photo to be deleted
   * @returns the photo object to be removed from database
  */
  public async getCollectionPhotoForDeletion(uuid: Uuid): Promise<MerchCollectionPhotoModel> {
    return this.transactions.readWrite(async (txn) => {
      const merchCollectionPhotoRepository = Repositories.merchStoreCollectionPhoto(txn);
      const collectionPhoto = await merchCollectionPhotoRepository.findByUuid(uuid);
      if (!collectionPhoto) throw new NotFoundError('Merch collection photo not found');

      const collection = await Repositories.merchStoreCollection(txn).findByUuid(collectionPhoto.merchCollection.uuid);
      if (collection.collectionPhotos.length === 1) {
        throw new UserError('Cannot delete the only photo for a collection');
      }

      return collectionPhoto;
    });
  }

  /**
   * Deletes the given item photo.
   *
   * @param merchPhoto the photo object to be removed
   * @returns the photo object removed from database
   */
  public async deleteCollectionPhoto(collectionPhoto: MerchCollectionPhotoModel): Promise<MerchCollectionPhoto> {
    return this.transactions.readWrite(async (txn) => {
      const merchStoreItemPhotoRepository = Repositories.merchStoreCollectionPhoto(txn);
      await merchStoreItemPhotoRepository.deleteCollectionPhoto(collectionPhoto);
      return collectionPhoto;
    });
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
      const { options, merchPhotos, collection: updatedCollection, ...changes } = itemEdit;
      if (options) {
        const optionUpdatesByUuid = new Map(options.map((option) => [option.uuid, option]));
        item.options.map((currentOption) => {
          if (!optionUpdatesByUuid.has(currentOption.uuid)) return;
          const optionUpdate = optionUpdatesByUuid.get(currentOption.uuid);
          // 'quantity' is incremented instead of directly set to avoid concurrency issues with orders
          // e.g. there's 10 of an item and someone adds 5 to stock while someone else orders 1
          // so the merch store admin sets quantity to 15 but the true quantity is 14.
          if (optionUpdate.quantityToAdd) {
            currentOption.quantity += optionUpdate.quantityToAdd;
            if (currentOption.quantity < 0) {
              throw new UserError(`Cannot decrement option quantity below 0 for option: ${currentOption.uuid}`);
            }
          }
          return MerchandiseItemOptionModel.merge(currentOption, optionUpdate);
        });
      }

      // this part only handles updating the positions of the pictures
      if (merchPhotos) {
        // error on duplicate photo uuids
        const dupSet = new Set();
        merchPhotos.forEach((merchPhoto) => {
          if (dupSet.has(merchPhoto.uuid)) {
            throw new UserError(`Multiple edits is made to photo: ${merchPhoto.uuid}`);
          }
          dupSet.add(merchPhoto.uuid);
        });

        const photoUpdatesByUuid = new Map(merchPhotos.map((merchPhoto) => [merchPhoto.uuid, merchPhoto]));

        item.merchPhotos.map((currentPhoto) => {
          if (!photoUpdatesByUuid.has(currentPhoto.uuid)) return;
          const photoUpdate = photoUpdatesByUuid.get(currentPhoto.uuid);
          return MerchandiseItemPhotoModel.merge(currentPhoto, photoUpdate);
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

  /**
   * Verify that items have valid options. An item with variants disabled cannot have multiple
   * options, and an item with variants enabled cannot have multiple option types.
   */
  private static verifyItemHasValidPhotos(item: MerchItem | MerchandiseItemModel) {
    if (item.merchPhotos.length > MerchStoreService.MAX_MERCH_PHOTO_COUNT) {
      throw new UserError('Merch items cannot have more than 5 pictures');
    }
  }

  /**
   * Creates an item photo and assign it the corresponding picture url
   * and append the photo to the photos list from merchItem
   * @param item merch item uuid
   * @param properties merch item photo picture url and position
   * @returns created item photo
   */
  public async createItemPhoto(item: Uuid, properties: MerchItemPhoto): Promise<PublicMerchItemPhoto> {
    return this.transactions.readWrite(async (txn) => {
      const merchItem = await Repositories.merchStoreItem(txn).findByUuid(item);
      if (!merchItem) throw new NotFoundError('Merch item not found');

      const createdPhoto = MerchandiseItemPhotoModel.create({ ...properties, merchItem });
      const merchStoreItemPhotoRepository = Repositories.merchStoreItemPhoto(txn);

      // verify the result photos array
      merchItem.merchPhotos.push(createdPhoto);
      MerchStoreService.verifyItemHasValidPhotos(merchItem);

      const upsertedPhoto = await merchStoreItemPhotoRepository.upsertMerchItemPhoto(createdPhoto);
      return upsertedPhoto.getPublicMerchItemPhoto();
    });
  }

  /**
   * Check if the photo is ready to be deleted. Fail if the merch item is visible
   * and it was the only photo of the item.
   *
   * @param uuid the uuid of photo to be deleted
   * @returns the photo object to be removed from database
   */
  public async getItemPhotoForDeletion(uuid: Uuid): Promise<MerchandiseItemPhotoModel> {
    return this.transactions.readWrite(async (txn) => {
      const merchStoreItemPhotoRepository = Repositories.merchStoreItemPhoto(txn);
      const merchPhoto = await merchStoreItemPhotoRepository.findByUuid(uuid);
      if (!merchPhoto) throw new NotFoundError('Merch item photo not found');

      const merchItem = await Repositories.merchStoreItem(txn).findByUuid(merchPhoto.merchItem.uuid);
      if (merchItem.merchPhotos.length === 1 && !merchItem.hidden) {
        throw new UserError('Cannot delete the only photo for a visible merch item');
      }

      return merchPhoto;
    });
  }

  /**
   * Deletes the given item photo.
   *
   * @param merchPhoto the photo object to be removed
   * @returns the photo object removed from database
   */
  public async deleteItemPhoto(merchPhoto: MerchandiseItemPhotoModel): Promise<MerchItemPhoto> {
    return this.transactions.readWrite(async (txn) => {
      const merchStoreItemPhotoRepository = Repositories.merchStoreItemPhoto(txn);
      await merchStoreItemPhotoRepository.deleteMerchItemPhoto(merchPhoto);
      return merchPhoto;
    });
  }

  private static humanReadableDateString(date: Date): string {
    return moment(date).tz('America/Los_Angeles').format('MMMM D, h:mm A');
  }

  public async validateOrder(originalOrder: MerchItemOptionAndQuantity[], user: UserModel): Promise<void> {
    return this.transactions.readWrite(async (txn) => this.validateOrderInTransaction(originalOrder, user, txn));
  }

  /**
   * Validates a merch order. An order is considered valid if all the below are true:
   *  - all the ordered item options exist within the database
   *  - the ordered item options were placed for non-hidden items
   *  - the user wouldn't reach monthly or lifetime limits for any item if this order is placed
   *  - the requested item options are in stock
   *  - the user has enough credits to place the order
   */
  private async validateOrderInTransaction(originalOrder: MerchItemOptionAndQuantity[],
    user: UserModel,
    txn: EntityManager): Promise<void> {
    await user.reload();
    const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
    const itemOptionsToOrder = await merchItemOptionRepository.batchFindByUuid(originalOrder.map((oi) => oi.option));
    if (itemOptionsToOrder.size !== originalOrder.length) {
      const requestedItems = originalOrder.map((oi) => oi.option);
      const foundItems = Array.from(itemOptionsToOrder.values())
        .filter((o) => !o.item.hidden)
        .map((o) => o.uuid);
      const missingItems = difference(requestedItems, foundItems);
      throw new NotFoundError(`The following items were not found: ${missingItems}`);
    }

    // Checks that hidden items were not ordered
    const hiddenItems = Array.from(itemOptionsToOrder.values())
      .filter((o) => o.item.hidden)
      .map((o) => o.uuid);

    if (hiddenItems.length !== 0) {
      throw new UserError(`Not allowed to order: ${hiddenItems}`);
    }

    // checks that the user hasn't exceeded monthly/lifetime purchase limits
    const merchOrderRepository = Repositories.merchOrder(txn);
    const lifetimePurchaseHistory = await merchOrderRepository.getAllOrdersWithItemsForUser(user);
    const oneMonthAgo = new Date(moment().subtract(1, 'month').unix());
    const pastMonthPurchaseHistory = lifetimePurchaseHistory.filter((o) => o.orderedAt > oneMonthAgo);
    const lifetimeItemOrderCounts = MerchStoreService.countItemOrders(itemOptionsToOrder, lifetimePurchaseHistory);
    const pastMonthItemOrderCounts = MerchStoreService.countItemOrders(itemOptionsToOrder, pastMonthPurchaseHistory);

    // aggregate requested quantities by item
    const requestedQuantitiesByMerchItem = Array.from(MerchStoreService
      .countItemRequestedQuantities(originalOrder, itemOptionsToOrder)
      .entries());

    for (let i = 0; i < requestedQuantitiesByMerchItem.length; i += 1) {
      const [uuid, itemWithQuantity] = requestedQuantitiesByMerchItem[i];
      if (!!itemWithQuantity.item.lifetimeLimit
        && lifetimeItemOrderCounts.get(uuid) + itemWithQuantity.quantity > itemWithQuantity.item.lifetimeLimit) {
        throw new UserError(`This order exceeds the lifetime limit for ${itemWithQuantity.item.itemName}`);
      }
      if (!!itemWithQuantity.item.monthlyLimit
        && pastMonthItemOrderCounts.get(uuid) + itemWithQuantity.quantity > itemWithQuantity.item.monthlyLimit) {
        throw new UserError(`This order exceeds the monthly limit for ${itemWithQuantity.item.itemName}`);
      }
    }

    // checks that enough units of requested item options are in stock
    for (let i = 0; i < originalOrder.length; i += 1) {
      const optionAndQuantity = originalOrder[i];
      const option = itemOptionsToOrder.get(optionAndQuantity.option);
      const quantityRequested = optionAndQuantity.quantity;
      if (option.quantity < quantityRequested) {
        throw new UserError(`There aren't enough units of ${option.item.itemName} in stock`);
      }
    }

    // checks that the user has enough credits to place order
    const totalCost = MerchStoreService.totalCost(originalOrder, itemOptionsToOrder);
    if (user.credits < totalCost) throw new UserError('You don\'t have enough credits for this order');
  }

  /**
   * Counts the number of times any MerchandiseItem has been ordered by the user.
   *
   * An ordered item does not contribute towards an option's count if its order
   * has been cancelled AND the item is unfufilled. An ordered item
   * whose order has been cancelled but the item is fulfilled still counts towards the count.
   */
  private static countItemOrders(itemOptionsToOrder: Map<string, MerchandiseItemOptionModel>, pastOrders: OrderModel[]):
  Map<string, number> {
    const counts = new Map<string, number>();
    const options = Array.from(itemOptionsToOrder.values());
    for (let o = 0; o < options.length; o += 1) {
      counts.set(options[o].item.uuid, 0);
    }
    const ordersByOrderItem = new Map<string, OrderModel>();
    const orderedItems: OrderItemModel[] = [];

    // go through every OrderItem previously ordered and add to above map/list
    for (let o = 0; o < pastOrders.length; o += 1) {
      for (let oi = 0; oi < pastOrders[o].items.length; oi += 1) {
        const orderItem = pastOrders[o].items[oi];
        ordersByOrderItem.set(orderItem.uuid, pastOrders[o]);
        orderedItems.push(orderItem);
      }
    }

    // count MerchItems based on number of OrderItems previously ordered
    for (let i = 0; i < orderedItems.length; i += 1) {
      const orderedItem = orderedItems[i];
      const order = ordersByOrderItem.get(orderedItem.uuid);
      if (MerchStoreService.doesItemCountTowardsOrderLimits(orderedItem, order)) {
        const { uuid: itemUuid } = orderedItem.option.item;
        if (counts.has(itemUuid)) {
          counts.set(itemUuid, counts.get(itemUuid) + 1);
        }
      }
    }
    return counts;
  }

  /**
   * An item counts towards the order limit if it has either been fulfilled or if
   * it's on hold for that customer. This means if the customer's order was cancelled
   * and the item is unfulfilled, then the item shouldn't count.
   * (having the order cancelled and the item fulfilled would mean the order was
   * partially fulfilled then cancelled, which would still count since that item belongs to that user)
   */
  private static doesItemCountTowardsOrderLimits(orderItem: OrderItemModel, order: OrderModel) {
    return order.status !== OrderStatus.CANCELLED || orderItem.fulfilled;
  }

  private static countItemRequestedQuantities(order: MerchItemOptionAndQuantity[],
    itemOptions: Map<string, MerchandiseItemOptionModel>): Map<string, MerchItemWithQuantity> {
    const requestedQuantitiesByMerchItem = new Map<string, MerchItemWithQuantity>();
    for (let i = 0; i < order.length; i += 1) {
      const option = itemOptions.get(order[i].option);

      const { item } = option;
      const quantityRequested = order[i].quantity;

      if (!requestedQuantitiesByMerchItem.has(item.uuid)) {
        requestedQuantitiesByMerchItem.set(item.uuid, {
          item,
          quantity: 0,
        });
      }
      requestedQuantitiesByMerchItem.get(item.uuid).quantity += quantityRequested;
    }
    return requestedQuantitiesByMerchItem;
  }

  private static totalCost(order: MerchItemOptionAndQuantity[],
    itemOptions: Map<string, MerchandiseItemOptionModel>): number {
    return order.reduce((sum, o) => {
      const option = itemOptions.get(o.option);
      const quantityRequested = o.quantity;
      return sum + (option.getPrice() * quantityRequested);
    }, 0);
  }

  public async getCartItems(options: string[]): Promise<MerchandiseItemOptionModel[]> {
    return this.transactions.readOnly(async (txn) => {
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const itemOptionsByUuid = await merchItemOptionRepository.batchFindByUuid(options);
      const itemOptionUuidsFound = Array.from(itemOptionsByUuid.keys());
      const missingItems = difference(options, itemOptionUuidsFound);
      if (missingItems.length > 0) {
        throw new NotFoundError(`The following items were not found: ${missingItems}`);
      }
      return options.map((option) => itemOptionsByUuid.get(option));
    });
  }

}
