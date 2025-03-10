import { Service } from 'typedi';
import { NotFoundError, ForbiddenError } from 'routing-controllers';
import { EntityManager } from 'typeorm';
import { difference, flatten, intersection } from 'underscore';
import * as moment from 'moment-timezone';
import { MerchItemWithQuantity, OrderItemPriceAndQuantity } from '../types/internal';
import {
  Uuid,
  ActivityType,
  OrderStatus,
  OrderPickupEvent,
  OrderPickupEventEdit,
  MerchItemOptionAndQuantity,
  OrderPickupEventStatus,
  OrderItemFulfillmentUpdate,
} from '../types';
import { OrderModel } from '../models/OrderModel';
import { UserModel } from '../models/UserModel';
import { EventModel } from '../models/EventModel';
import { UserError } from '../utils/Errors';
import { OrderItemModel } from '../models/OrderItemModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';

import EmailService, { OrderInfo, OrderPickupEventInfo } from './EmailService';

import Repositories, { TransactionsManager, MerchOrderRepository, OrderItemRepository } from '../repositories';

@Service()
export default class MerchOrderService {
  private emailService: EmailService;

  private transactions: TransactionsManager;

  constructor(transactions: TransactionsManager, emailService: EmailService) {
    this.transactions = transactions;
    this.emailService = emailService;
  }

  public async findOrderByUuid(uuid: Uuid): Promise<OrderModel> {
    const order = await this.transactions.readOnly(async (txn) => Repositories
      .merchOrder(txn)
      .findByUuid(uuid));
    if (!order) throw new NotFoundError('Merch order not found');
    return order;
  }

  public async getAllOrdersForUser(user: UserModel): Promise<OrderModel[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .merchOrder(txn)
      .getAllOrdersForUser(user));
  }

  public async getAllOrdersForAllUsers(): Promise<OrderModel[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .merchOrder(txn)
      .getAllOrdersForAllUsers());
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
   *    - the pickup event specified exists and is at least 2 days before starting
   *    - the pickup event is not at or above the current order limit
   * The order needs to match all order verification constraints defined in verifyOrderUnderTransaction()
   *
   * @param originalOrder the order containing item options and their quantities
   * @param user user placing the order
   * @returns the finalized order, including sale price, discount, and fulfillment details
   */
  public async placeOrder(originalOrder: MerchItemOptionAndQuantity[],
    user: UserModel,
    pickupEventUuid: Uuid): Promise<OrderModel> {
    const [order, merchItemOptions] = await this.transactions.readWrite(async (txn) => {
      const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
      const itemOptions = await merchItemOptionRepository.batchFindByUuid(originalOrder.map((oi) => oi.option));
      await this.validateOrderInTransaction(originalOrder, user, txn);

      // Verify the requested pickup event exists,
      // and that the order is placed at least 2 days before the pickup event starts
      const pickupEvent = await Repositories.merchOrderPickupEvent(txn).findByUuid(pickupEventUuid);
      if (!pickupEvent) {
        throw new NotFoundError('Pickup event requested is not found');
      }
      if (MerchOrderService.isLessThanTwoDaysBeforePickupEvent(pickupEvent)) {
        throw new NotFoundError('Cannot pickup order at an event that starts in less than 2 days');
      }

      // Verify that this order would not set the pickup event's order count
      // over the order limit
      if (MerchOrderService.isPickupEventOrderLimitFull(pickupEvent)) {
        throw new UserError('This merch pickup event is full! Please choose a different pickup event');
      }

      const totalCost = MerchOrderService.totalCost(originalOrder, itemOptions);
      const merchOrderRepository = Repositories.merchOrder(txn);

      // if all checks pass, the order is placed
      const createdOrder = await merchOrderRepository.upsertMerchOrder(MerchOrderRepository.create({
        user,
        totalCost,
        items: flatten(originalOrder.map((optionAndQuantity) => {
          const option = itemOptions.get(optionAndQuantity.option);
          const quantityRequested = optionAndQuantity.quantity;
          return Array(quantityRequested).fill(OrderItemRepository.create({
            option,
            salePriceAtPurchase: option.getPrice(),
            discountPercentageAtPurchase: option.discountPercentage,
          }));
        })),
        pickupEvent,
      }));

      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ORDER_PLACED,
        description: `Order ${createdOrder.uuid}`,
      });

      await Promise.all(originalOrder.map(async (optionAndQuantity) => {
        const option = itemOptions.get(optionAndQuantity.option);
        const updatedQuantity = option.quantity - optionAndQuantity.quantity;
        return merchItemOptionRepository.upsertMerchItemOption(option, { quantity: updatedQuantity });
      }));

      const userRepository = Repositories.user(txn);
      await userRepository.upsertUser(user, { credits: user.credits - totalCost });
      return [createdOrder, itemOptions];
    });

    const orderConfirmation = {
      uuid: order.uuid,
      items: originalOrder.map((oi) => {
        const option = merchItemOptions.get(oi.option);
        const { item } = option;
        return {
          ...item,
          picture: item.getDefaultPhotoUrl(),
          quantityRequested: oi.quantity,
          salePrice: option.getPrice(),
          total: oi.quantity * option.getPrice(),
        };
      }),
      totalCost: order.totalCost,
      pickupEvent: MerchOrderService.toPickupEventUpdateInfo(order.pickupEvent),
    };
    this.emailService.sendOrderConfirmation(user.email, user.firstName, orderConfirmation);

    return order;
  }

  public async validateOrder(originalOrder: MerchItemOptionAndQuantity[], user: UserModel): Promise<void> {
    return this.transactions.readWrite(async (txn) => this.validateOrderInTransaction(originalOrder, user, txn));
  }

  private static toPickupEventUpdateInfo(pickupEvent: OrderPickupEventModel): OrderPickupEventInfo {
    return {
      ...pickupEvent,
      start: MerchOrderService.humanReadableDateString(pickupEvent.start),
      end: MerchOrderService.humanReadableDateString(pickupEvent.end),
    };
  }

  private static humanReadableDateString(date: Date): string {
    return moment(date).tz('America/Los_Angeles').format('MMMM D, h:mm A');
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
    user = await Repositories.user(txn).findByUuid(user.uuid);
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
    const lifetimeItemOrderCounts = MerchOrderService.countItemOrders(itemOptionsToOrder, lifetimePurchaseHistory);
    const pastMonthItemOrderCounts = MerchOrderService.countItemOrders(itemOptionsToOrder, pastMonthPurchaseHistory);

    // aggregate requested quantities by item
    const requestedQuantitiesByMerchItem = Array.from(MerchOrderService
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
    const totalCost = MerchOrderService.totalCost(originalOrder, itemOptionsToOrder);
    if (user.credits < totalCost) throw new UserError('You don\'t have enough credits for this order');
  }

  private static isPickupEventOrderLimitFull(pickupEvent: OrderPickupEventModel): boolean {
    const currentOrderCount = pickupEvent.orders.filter((o) => o.status !== OrderStatus.CANCELLED).length;
    return currentOrderCount >= pickupEvent.orderLimit;
  }

  /**
   * Changes the pickup event of an order to a new one. The new pickup event must start more than 2 calendar
   * days after the current time.
   *
   * If successful, the order's status is updated to PLACED,
   * allowing it to be fulfilled by MerchOrderService::fulfillOrderItems()
   */
  public async rescheduleOrderPickup(orderUuid: Uuid, pickupEventUuid: Uuid, user: UserModel): Promise<OrderModel> {
    return this.transactions.readWrite(async (txn) => {
      const orderRepository = Repositories.merchOrder(txn);
      const order = await orderRepository.findByUuid(orderUuid);
      if (!order) throw new NotFoundError('Order not found');
      if (order.user.uuid !== user.uuid) throw new ForbiddenError('Cannot edit the order of a different user');
      if (MerchOrderService.isInactiveOrder(order)) throw new UserError('Cannot modify pickup for inactive orders');
      // the 2-day check is only necessary on PLACED orders since for other states,
      // the pickup event would've already passed
      if (order.status === OrderStatus.PLACED
        && MerchOrderService.isLessThanTwoDaysBeforePickupEvent(order.pickupEvent)) {
        throw new UserError('Cannot reschedule an order pickup within 2 days of the event');
      }

      const newPickupEventForOrder = await Repositories.merchOrderPickupEvent(txn).findByUuid(pickupEventUuid);
      if (!newPickupEventForOrder) throw new NotFoundError('Order pickup event not found');
      if (MerchOrderService.isLessThanTwoDaysBeforePickupEvent(newPickupEventForOrder)) {
        throw new UserError('Cannot change order pickup to an event that starts in less than 2 days');
      }
      if (MerchOrderService.isPickupEventOrderLimitFull(newPickupEventForOrder)) {
        throw new UserError('This merch pickup event is full! Please choose a different pickup event');
      }
      const orderInfo = await MerchOrderService.buildOrderUpdateInfo(order, newPickupEventForOrder, txn);
      await this.emailService.sendOrderPickupUpdated(user.email, user.firstName, orderInfo);
      return orderRepository.upsertMerchOrder(order, {
        pickupEvent: newPickupEventForOrder,
        status: OrderStatus.PLACED,
      });
    });
  }

  private static isLessThanTwoDaysBeforePickupEvent(pickupEvent: OrderPickupEventModel): boolean {
    return new Date() > moment(pickupEvent.start).subtract(2, 'days').toDate();
  }

  private static isInactiveOrder(order: OrderModel): boolean {
    return order.status === OrderStatus.FULFILLED || order.status === OrderStatus.CANCELLED;
  }

  /**
   * Marks an order as missed. An order can be marked as missed only if it's previous status was PLACED,
   * and its associated pickup event has already passed. Only admins can mark orders as missed
   * @param uuid order uuid
   * @returns updated order
   */
  public async markOrderAsMissed(uuid: Uuid, distributor: UserModel): Promise<OrderModel> {
    return this.transactions.readWrite(async (txn) => {
      const orderRespository = Repositories.merchOrder(txn);
      const order = await orderRespository.findByUuid(uuid);
      if (!order) throw new NotFoundError('Order not found');
      if (order.status !== OrderStatus.PLACED) {
        throw new UserError('Cannot mark an order as missed if it\'s already been cancelled, missed, or fulfilled');
      }
      // compare with start date and not end date so that store admins can mark orders
      // as missed during the event and not necessarily limited to after the event
      // (e.g. in the case where the event ends early)
      if (new Date() < moment(order.pickupEvent.start).toDate()) {
        throw new NotFoundError('Cannot mark an order as missed if its pickup event hasn\'t started yet');
      }
      const orderUpdateInfo = await MerchOrderService
        .buildOrderUpdateInfo(order, order.pickupEvent, txn);
      const { user } = order;

      await this.emailService.sendOrderPickupMissed(user.email, user.firstName, orderUpdateInfo);

      const upsertedOrder = await orderRespository.upsertMerchOrder(order, { status: OrderStatus.PICKUP_MISSED });
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ORDER_MISSED,
        description: `Order ${order.uuid} marked as missed for ${user.uuid} by ${distributor.uuid}`,
      });
      return upsertedOrder;
    });
  }

  /**
   * Cancels a merch order, refunding the user of its credits if the user is the one who cancelled the order.
   */
  public async cancelMerchOrder(orderUuid: Uuid, user: UserModel): Promise<OrderModel> {
    return this.transactions.readWrite(async (txn) => {
      const orderRespository = Repositories.merchOrder(txn);
      const order = await orderRespository.findByUuid(orderUuid);
      if (!order) throw new NotFoundError('Order not found');
      if (!user.isAdmin() && order.user.uuid !== user.uuid) {
        throw new ForbiddenError('Members cannot cancel other members\' orders');
      }
      if (MerchOrderService.isInactiveOrder(order)) throw new UserError('Cannot cancel an inactive order');
      // the 2-day check is only necessary on PLACED orders since for other states,
      // the pickup event would've already passed
      if (order.status === OrderStatus.PLACED
        && MerchOrderService.isLessThanTwoDaysBeforePickupEvent(order.pickupEvent)) {
        throw new NotFoundError('Cannot cancel an order with a pickup date less than 2 days away');
      }

      const customer = order.user;
      await this.refundAndConfirmOrderCancellation(order, user, txn);
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ORDER_CANCELLED,
        description: `Order ${order.uuid} cancelled and refunded to ${customer.uuid} by ${user.uuid}`,
      });
      return order;
    });
  }

  private async refundAndConfirmOrderCancellation(order: OrderModel, user: UserModel, txn: EntityManager) {
    // refund and restock items
    const refundedItems = await MerchOrderService.refundAndRestockItems(order, user, txn);

    // send email confirming cancel
    const orderUpdateInfo = await MerchOrderService.buildOrderCancellationInfo(order, refundedItems, txn);
    await this.emailService.sendOrderCancellation(user.email, user.firstName, orderUpdateInfo);
  }

  private async refundAndConfirmAutomatedOrderCancellation(order: OrderModel, user: UserModel, txn: EntityManager) {
    // refund and restock items
    const refundedItems = await MerchOrderService.refundAndRestockItems(order, user, txn);

    // send email confirming automated cancel by admin
    const orderUpdateInfo = await MerchOrderService.buildOrderCancellationInfo(order, refundedItems, txn);
    await this.emailService.sendAutomatedOrderCancellation(user.email, user.firstName, orderUpdateInfo);
  }

  private static async buildOrderCancellationInfo(order: OrderModel, refundedItems: OrderItemModel[],
    txn: EntityManager): Promise<OrderInfo> {
    const orderRepository = Repositories.merchOrder(txn);
    const upsertedOrder = await orderRepository.upsertMerchOrder(order, { status: OrderStatus.CANCELLED });
    const orderWithOnlyUnfulfilledItems = orderRepository.merge(upsertedOrder, { items: refundedItems });
    return MerchOrderService.buildOrderUpdateInfo(orderWithOnlyUnfulfilledItems, upsertedOrder.pickupEvent, txn);
  }

  private static async refundAndRestockItems(order: OrderModel, user: UserModel, txn: EntityManager):
  Promise<OrderItemModel[]> {
    // refund only the items that haven't been fulfilled yet
    const unfulfilledItems = order.items.filter((item) => !item.fulfilled);
    const refundValue = unfulfilledItems.reduce((refund, item) => refund + item.salePriceAtPurchase, 0);
    await MerchOrderService.refundUser(user, refundValue, txn);

    // restock items that were cancelled
    const optionsToRestock = unfulfilledItems.map((item) => item.option);
    const merchItemOptionRepository = Repositories.merchStoreItemOption(txn);
    await Promise.all(optionsToRestock.map((option) => {
      const quantityUpdate = { quantity: option.quantity + 1 };
      return merchItemOptionRepository.upsertMerchItemOption(option, quantityUpdate);
    }));
    return unfulfilledItems;
  }

  /**
   * Process fulfillment updates for all order items of an order.
   * If all items get fulfilled after this update, then the order is considered fulfilled.
   * @param fulfillmentUpdates fulfillment updates for order. This should be an array of every order item for an order.
   * @param orderUuid order uuid
   */
  public async fulfillOrderItems(fulfillmentUpdates: OrderItemFulfillmentUpdate[], orderUuid: Uuid,
    user: UserModel): Promise<OrderModel> {
    return this.transactions.readWrite(async (txn) => {
      // check if order exists
      const orderRepository = Repositories.merchOrder(txn);
      let order = await orderRepository.findByUuid(orderUuid);
      if (!order) throw new NotFoundError('Order not found');

      // check if pickup event hasn't started (items can only be fulfilled during or after pickup events)
      const { pickupEvent } = order;
      if (MerchOrderService.isFuturePickupEvent(pickupEvent)) {
        throw new UserError('Cannot fulfill items of an order that has a pickup event that hasn\'t started yet');
      }
      // check if order is in PLACED status (by order state machine design)
      if (order.status !== OrderStatus.PLACED) {
        throw new UserError(`This order is not able to be fulfilled. Order state must be PLACED, is ${order.status}`);
      }

      const { items } = order;
      const toBeFulfilled = fulfillmentUpdates
        .map((oi) => oi.uuid);
      const alreadyFulfilled = Array.from(items.values())
        .filter((oi) => oi.fulfilled)
        .map((oi) => oi.uuid);
      if (intersection(toBeFulfilled, alreadyFulfilled).length > 0) {
        throw new UserError('At least one order item marked to be fulfilled has already been fulfilled');
      }

      // fulfill all items in request and set entire order status as fulfilled if all items were fulfilled
      const itemUpdatesByUuid = new Map(fulfillmentUpdates.map((update) => [update.uuid, update]));
      const orderItemRepository = Repositories.merchOrderItem(txn);
      const updatedItems = await Promise.all(Array.from(items.values()).map((oi) => {
        if (!itemUpdatesByUuid.has(oi.uuid)) return oi;
        const { notes } = itemUpdatesByUuid.get(oi.uuid);
        return orderItemRepository.fulfillOrderItem(oi, notes);
      }));

      // send order fulfillment emails and log activity
      const activityRepository = Repositories.activity(txn);
      const customer = order.user;
      const isEntireOrderFulfilled = updatedItems.every((item) => item.fulfilled);
      if (isEntireOrderFulfilled) {
        const orderUpdateInfo = await MerchOrderService.buildOrderUpdateInfo(order, pickupEvent, txn);
        await this.emailService.sendOrderFulfillment(customer.email, customer.firstName, orderUpdateInfo);
        order = await orderRepository.upsertMerchOrder(order, { status: OrderStatus.FULFILLED });
        await activityRepository.logActivity({
          user: customer,
          type: ActivityType.ORDER_FULFILLED,
          description: `Order ${order.uuid} completely fulfilled for user ${customer.uuid} by ${user.uuid}`,
        });
      } else {
        // need to send email containing details of the items that were fulfilled
        // and the ones that still need to be fulfilled (to be picked up at the next event),
        // so convert order into fulfilled and unfulfilled item sets
        const fulfilledItems = order.items.filter((item) => item.fulfilled);
        const fulfilledItemsCost = fulfilledItems.reduce((cost, curr) => cost + curr.salePriceAtPurchase, 0);
        const orderWithFulfilledItems = orderRepository.create({
          ...order,
          items: fulfilledItems,
          totalCost: fulfilledItemsCost,
        });
        const unfulfilledItems = order.items.filter((item) => !item.fulfilled);
        const unfulfilledItemsCost = unfulfilledItems.reduce((cost, curr) => cost + curr.salePriceAtPurchase, 0);
        const orderWithUnfulfilledItems = orderRepository.create({
          ...order,
          items: unfulfilledItems,
          totalCost: unfulfilledItemsCost,
        });
        const { items: fulfilledItemInfo } = await MerchOrderService
          .buildOrderUpdateInfo(orderWithFulfilledItems, pickupEvent, txn);
        const { items: unfulfilledItemInfo } = await MerchOrderService
          .buildOrderUpdateInfo(orderWithUnfulfilledItems, pickupEvent, txn);
        const pickupEventInfo = MerchOrderService.toPickupEventUpdateInfo(pickupEvent);

        await this.emailService.sendPartialOrderFulfillment(
          customer.email,
          customer.firstName,
          fulfilledItemInfo,
          unfulfilledItemInfo,
          pickupEventInfo,
          orderWithUnfulfilledItems.uuid,
        );
        order = await orderRepository.upsertMerchOrder(order, { status: OrderStatus.PARTIALLY_FULFILLED });
        await activityRepository.logActivity({
          user: customer,
          type: ActivityType.ORDER_PARTIALLY_FULFILLED,
          description: `Order ${order.uuid} partially fulfilled for user ${customer.uuid} by ${user.uuid}`,
        });
      }
      return order;
    });
  }

  public async cancelAllPendingOrders(user: UserModel): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const merchOrderRepository = Repositories.merchOrder(txn);
      const pendingOrders = await merchOrderRepository.getAllOrdersForAllUsers(
        ...MerchOrderService.pendingOrderStatuses(),
      );
      await Promise.all(pendingOrders.map(
        (order) => this.refundAndConfirmAutomatedOrderCancellation(order, order.user, txn),
      ));
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.PENDING_ORDERS_CANCELLED,
      });
    });
  }

  private static pendingOrderStatuses(): OrderStatus[] {
    return [
      OrderStatus.PARTIALLY_FULFILLED,
      OrderStatus.PICKUP_CANCELLED,
      OrderStatus.PICKUP_MISSED,
    ];
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
      if (MerchOrderService.doesItemCountTowardsOrderLimits(orderedItem, order)) {
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

  private static isPickupEventHappeningToday(pickupEvent: OrderPickupEventModel): boolean {
    return moment().isSame(moment(pickupEvent.start), 'day');
  }

  private static isFuturePickupEvent(pickupEvent: OrderPickupEventModel): boolean {
    return moment().isBefore(moment(pickupEvent.start));
  }

  /**
   * Completes an order pickup event, marking any orders that haven't been fulfilled
   * or partially fulfilled as missed.
   * @returns all orders that have been marked as missed
   */
  public async completePickupEvent(uuid: Uuid): Promise<OrderModel[]> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      if (!pickupEvent) throw new NotFoundError('Order pickup event not found');
      if (!MerchOrderService.isActivePickupEvent(pickupEvent)) {
        throw new UserError('Cannot complete a pickup event that isn\'t currently active');
      }
      if (MerchOrderService.isFuturePickupEvent(pickupEvent)) {
        throw new UserError('Cannot complete a pickup event that\'s hasn\'t happened yet');
      }

      await orderPickupEventRepository.upsertPickupEvent(pickupEvent, { status: OrderPickupEventStatus.COMPLETED });

      // mark all unfulfilled orders as missed
      const ordersToMarkAsMissed = pickupEvent.orders.filter((order) => this.isUnfulfilledOrder(order));
      const orderRepository = Repositories.merchOrder(txn);
      return Promise.all(ordersToMarkAsMissed.map(async (order) => {
        await orderRepository.upsertMerchOrder(order, { status: OrderStatus.PICKUP_MISSED });
        const { user: customer } = order;
        const orderUpdateInfo = await MerchOrderService.buildOrderUpdateInfo(order, pickupEvent, txn);
        await this.emailService.sendOrderPickupMissed(customer.email, customer.firstName, orderUpdateInfo);
        return order;
      }));
    });
  }

  private isUnfulfilledOrder(order: OrderModel): boolean {
    return order.status !== OrderStatus.FULFILLED
    && order.status !== OrderStatus.PARTIALLY_FULFILLED
    && order.status !== OrderStatus.CANCELLED;
  }

  /**
   * Builds an order update info object to be sent in emails, based on the order.
   * @param order order
   * @param txn transaction
   * @returns order update info for email
   */
  private static async buildOrderUpdateInfo(order: OrderModel, pickupEvent: OrderPickupEventModel,
    txn: EntityManager): Promise<OrderInfo> {
    // maps an item option to its price at purchase and quantity ordered by the user
    const optionPricesAndQuantities = MerchOrderService.getPriceAndQuantityByOption(order);
    const itemOptionsOrdered = Array.from(optionPricesAndQuantities.keys());
    const itemOptionByUuid = await Repositories
      .merchStoreItemOption(txn)
      .batchFindByUuid(itemOptionsOrdered);

    return {
      uuid: order.uuid,
      items: itemOptionsOrdered.map((option) => {
        const { item } = itemOptionByUuid.get(option);
        const { quantity, price } = optionPricesAndQuantities.get(option);
        return {
          ...item,
          picture: item.getDefaultPhotoUrl(),
          quantityRequested: quantity,
          salePrice: price,
          total: quantity * price,
        };
      }),
      totalCost: order.totalCost,
      pickupEvent: MerchOrderService.toPickupEventUpdateInfo(pickupEvent),
    };
  }

  /**
   * Maps an item's option to its price at purchase and quantity ordered by the user
   * @param order order
   * @returns map of item option to its price at purchase and quantity ordered by the user
   */
  private static getPriceAndQuantityByOption(order: OrderModel): Map<Uuid, OrderItemPriceAndQuantity> {
    const optionToPriceAndQuantity = new Map<string, OrderItemPriceAndQuantity>();
    for (let i = 0; i < order.items.length; i += 1) {
      const oi = order.items[i];
      const { uuid } = oi.option;
      if (optionToPriceAndQuantity.has(uuid)) {
        const { price, quantity } = optionToPriceAndQuantity.get(uuid);
        optionToPriceAndQuantity.set(uuid, {
          quantity: quantity + 1,
          price,
        });
      } else {
        optionToPriceAndQuantity.set(uuid, {
          quantity: 1,
          price: oi.salePriceAtPurchase,
        });
      }
    }
    return optionToPriceAndQuantity;
  }

  private static async refundUser(user: UserModel, refund: number, txn: EntityManager): Promise<UserModel> {
    return Repositories.user(txn).upsertUser(user, { credits: user.credits + refund });
  }

  public async getPastPickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .merchOrderPickupEvent(txn)
      .getPastPickupEvents());
  }

  public async getFuturePickupEvents(): Promise<OrderPickupEventModel[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .merchOrderPickupEvent(txn)
      .getFuturePickupEvents());
  }

  public async getPickupEvent(uuid: Uuid): Promise<OrderPickupEventModel> {
    return this.transactions.readOnly(async (txn) => {
      const pickupEvent = await Repositories.merchOrderPickupEvent(txn).findByUuid(uuid);
      if (!pickupEvent) throw new NotFoundError('Order pickup event not found');
      return pickupEvent;
    });
  }

  public async createPickupEvent(pickupEvent: OrderPickupEvent): Promise<OrderPickupEventModel> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      if (pickupEvent.start >= pickupEvent.end) {
        throw new UserError('Order pickup event start time must come before the end time');
      }

      const pickupEventModel = orderPickupEventRepository.create(pickupEvent);

      if (pickupEvent.linkedEventUuid) {
        const linkedRegularEvent = await this.getLinkedRegularEvent(pickupEvent.linkedEventUuid);
        pickupEventModel.linkedEvent = linkedRegularEvent;
      }

      if (MerchOrderService.isLessThanTwoDaysBeforePickupEvent(pickupEventModel)) {
        throw new UserError('Cannot create a pickup event that starts in less than 2 days');
      }

      return orderPickupEventRepository.upsertPickupEvent(pickupEventModel);
    });
  }

  public async editPickupEvent(uuid: Uuid, changes: OrderPickupEventEdit): Promise<OrderPickupEventModel> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      const updatedPickupEvent = orderPickupEventRepository.merge(pickupEvent, changes);

      if (changes.linkedEventUuid) {
        const linkedRegularEvent = await this.getLinkedRegularEvent(changes.linkedEventUuid);
        updatedPickupEvent.linkedEvent = linkedRegularEvent;
      }

      if (updatedPickupEvent.start >= updatedPickupEvent.end) {
        throw new UserError('Order pickup event start time must come before the end time');
      }
      const currentOrderCount = pickupEvent.orders.length;
      if (updatedPickupEvent.orderLimit < currentOrderCount) {
        throw new UserError('Pickup event cannot have order limit lower than the number of orders booked in it');
      }
      return orderPickupEventRepository.upsertPickupEvent(updatedPickupEvent);
    });
  }

  /**
   * Delete a pickup event. No pickups must be scheduled for this event
   * in order for deletion to succeed.
   */
  public async deletePickupEvent(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      if (!pickupEvent) throw new NotFoundError('Order pickup event not found');
      if (pickupEvent.orders.length > 0) {
        throw new UserError('Cannot delete a pickup event that has order pickups scheduled for it');
      }
      await orderPickupEventRepository.deletePickupEvent(pickupEvent);
    });
  }

  /**
   * Cancel a pickup event. All orders for the pickup event will
   * have emails sent out to the users who've placed the order.
   */
  public async cancelPickupEvent(uuid: Uuid): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      const orderPickupEventRepository = Repositories.merchOrderPickupEvent(txn);
      const orderRepository = Repositories.merchOrder(txn);
      const pickupEvent = await orderPickupEventRepository.findByUuid(uuid);
      if (!pickupEvent) throw new NotFoundError('Order pickup event not found');
      if (!MerchOrderService.isActivePickupEvent(pickupEvent)) {
        throw new UserError('Cannot cancel a pickup event that isn\'t currently active');
      }

      // concurrently email the order cancellation email and update order status for every order
      // then set pickupEvent to null before deleting from table
      await Promise.all(pickupEvent.orders.map(async (order) => {
        const orderUpdateInfo = await MerchOrderService.buildOrderUpdateInfo(order, pickupEvent, txn);
        const { user } = order;
        await this.emailService.sendOrderPickupCancelled(user.email, user.firstName, orderUpdateInfo);
        await orderRepository.upsertMerchOrder(order, { status: OrderStatus.PICKUP_CANCELLED, pickupEvent: null });
        return orderRepository.merge(order, { pickupEvent: null });
      }));
      await orderPickupEventRepository.upsertPickupEvent(pickupEvent, { status: OrderPickupEventStatus.CANCELLED });
    });
  }

  private static isActivePickupEvent(pickupEvent: OrderPickupEventModel) {
    return pickupEvent.status === OrderPickupEventStatus.ACTIVE;
  }

  private async getLinkedRegularEvent(uuid: Uuid): Promise<EventModel> {
    return this.transactions.readOnly(async (txn) => {
      const linkedEvent = await Repositories.event(txn).findByUuid(uuid);
      if (!linkedEvent) throw new NotFoundError('Linked event not found!');
      return linkedEvent;
    });
  }
}
