import * as faker from 'faker';
import * as moment from 'moment';
import { mock, when, anything, instance, verify, anyString } from 'ts-mockito';
import { ForbiddenError } from 'routing-controllers';
import EmailService from '../services/EmailService';
import { OrderModel } from '../models/OrderModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { UserAccessType, OrderStatus, ActivityType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, MerchFactory, PortalState, UserFactory } from './data';
import { MerchStoreControllerWrapper } from './controllers/MerchStoreControllerWrapper';

beforeAll(async () => {
  await DatabaseConnection.connect();
});

beforeEach(async () => {
  await DatabaseConnection.clear();
});

afterAll(async () => {
  await DatabaseConnection.clear();
  await DatabaseConnection.close();
});

describe('merch orders', () => {
  test('members can place orders on merch items if they\'re in stock and can afford them', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const anotherOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createMerchItemOptions(anotherOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
      {
        option: anotherOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const placeMerchOrderResponse = await ControllerFactory
      .merchStore(conn, instance(emailService))
      .placeMerchOrder(placeMerchOrderRequest, member);
    const placedOrder = placeMerchOrderResponse.order;

    expect(placedOrder.items).toHaveLength(2);
    expect(placedOrder.status).toStrictEqual(OrderStatus.PLACED);

    // check credits have been deducted
    await member.reload();
    expect(member.credits).toEqual(5000);

    // check order activity has been logged
    const memberActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const orderPlacedActivity = memberActivityStream.activity[memberActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.ORDER_PLACED);

    // check order confirmation email has been sent
    verify(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .called();
  });

  test('members can have orders fulfilled by store distributors', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const anotherOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createMerchItemOptions(anotherOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderFulfillment(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
      {
        option: anotherOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // fulfill all items in order
    const placedOrder = placedOrderResponse.order;
    const uuidParams = { uuid: placedOrder.uuid };
    const fulfillMerchOrderItemsRequest = {
      items: [
        {
          uuid: placedOrder.items[0].uuid,
        },
        {
          uuid: placedOrder.items[1].uuid,
        },
      ],
    };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, uuidParams,
      fulfillMerchOrderItemsRequest, merchDistributor, conn, pickupEvent);

    const getOrderResponse = await merchController.getOneMerchOrder(uuidParams, member);
    const fulfilledOrder = getOrderResponse.order;

    expect(fulfilledOrder.status).toEqual(OrderStatus.FULFILLED);
    expect(fulfilledOrder.items[0].fulfilled).toBeTruthy();
    expect(fulfilledOrder.items[1].fulfilled).toBeTruthy();

    verify(emailService.sendOrderFulfillment(member.email, member.firstName, anything()))
      .called();

    // check fulfilled activity
    const memberActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const orderPlacedActivity = memberActivityStream.activity[memberActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.ORDER_FULFILLED);
  });

  test('members can have orders partially fulfilled by store distributors', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const anotherOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createMerchItemOptions(anotherOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendPartialOrderFulfillment(
      member.email, member.firstName, anything(), anything(), anything(), anything(),
    ))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
      {
        option: anotherOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // fulfill a single item in an order
    const placedOrder = placedOrderResponse.order;
    const orderParams = { uuid: placedOrder.uuid };
    const fulfillMerchOrderItemsRequest = {
      items: [
        {
          uuid: placedOrder.items[0].uuid,
        },
      ],
    };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, orderParams,
      fulfillMerchOrderItemsRequest, merchDistributor, conn, pickupEvent);

    const getOrderResponse = await merchController.getOneMerchOrder(orderParams, member);
    const partiallyFulfilledOrder = getOrderResponse.order;

    expect(partiallyFulfilledOrder.status).toEqual(OrderStatus.PARTIALLY_FULFILLED);
    expect(partiallyFulfilledOrder.items.some((item) => item.fulfilled)).toBeTruthy();
    expect(partiallyFulfilledOrder.items.every((item) => item.fulfilled)).toBeFalsy();

    // check confirmation email has been sent
    verify(emailService.sendPartialOrderFulfillment(
      member.email, member.firstName, anything(), anything(), anything(), anything(),
    ))
      .called();

    // check fulfilled activity
    const memberActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const orderPlacedActivity = memberActivityStream.activity[memberActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.ORDER_PARTIALLY_FULFILLED);
  });

  test('members can have partially fulfilled orders completely fulfilled if they reschedule', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const anotherOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createMerchItemOptions(anotherOption)
      .createOrderPickupEvents(pickupEvent, anotherPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendPartialOrderFulfillment(
      member.email, member.firstName, anything(), anything(), anything(), anything(),
    ))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
      {
        option: anotherOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // fulfill a single item in an order
    const placedOrder = placedOrderResponse.order;
    const orderParams = { uuid: placedOrder.uuid };
    const partialFulfillmentRequest = {
      items: [
        {
          uuid: placedOrder.items[0].uuid,
        },
      ],
    };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, orderParams,
      partialFulfillmentRequest, merchDistributor, conn, pickupEvent);

    // verify the order is now PARTIALLY_FULFILLED
    const partiallyFulfilledOrderResponse = await merchController.getOneMerchOrder(orderParams, member);
    expect(partiallyFulfilledOrderResponse.order.status).toEqual(OrderStatus.PARTIALLY_FULFILLED);

    // reschedule pickup event
    const newPickupEventParams = { pickupEvent: anotherPickupEvent.uuid };
    await merchController.rescheduleOrderPickup(orderParams, newPickupEventParams, member);

    // verify the order is now back at PLACED status
    const rescheduledOrderResponse = await merchController.getOneMerchOrder(orderParams, member);
    expect(rescheduledOrderResponse.order.status).toEqual(OrderStatus.PLACED);

    // fulfill the rest of the order during that pickup event
    const completeFulfillmentRequest = {
      items: [
        {
          uuid: placedOrder.items[1].uuid,
        },
      ],
    };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, orderParams,
      completeFulfillmentRequest, merchDistributor, conn, anotherPickupEvent);

    // verify the order is fulfilled
    const fulfilledOrderResponse = await merchController.getOneMerchOrder(orderParams, member);
    expect(fulfilledOrderResponse.order.status).toEqual(OrderStatus.FULFILLED);
  });

  test('members can cancel orders and receive a full refund', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // cancel order
    const { uuid } = placedOrderResponse.order;
    await merchController.cancelMerchOrder({ uuid }, member);

    // get order, making sure state was updated and user has been refunded
    const cancelledOrderResponse = await merchController.getOneMerchOrder({ uuid }, member);
    const cancelledOrder = cancelledOrderResponse.order;
    expect(cancelledOrder.status).toEqual(OrderStatus.CANCELLED);

    // check cancelled activity
    const memberActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const orderPlacedActivity = memberActivityStream.activity[memberActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.ORDER_CANCELLED);

    // check credits
    await member.reload();
    expect(member.credits).toEqual(10000);
    verify(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .called();
  });

  test('members can cancel partially fulfilled orders and obtain partial refunds', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const item = MerchFactory.fakeItem({
      monthlyLimit: 5,
      lifetimeLimit: 5,
      options: [affordableOption],
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItem(item)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendPartialOrderFulfillment(
      member.email, member.firstName, anything(), anything(), anything(), anything(),
    ))
      .thenResolve();
    when(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const orderRequest = [
      {
        option: affordableOption.uuid,
        quantity: 2,
      },
    ];
    const placeMerchOrderRequest = {
      order: orderRequest,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // fulfill a single item
    const order = placedOrderResponse.order.uuid;
    const fulfillOrderParams = { uuid: order };
    const orderItem = placedOrderResponse.order.items[0].uuid;
    const fulfillmentUpdate = { uuid: orderItem, notes: faker.datatype.hexaDecimal(10) };
    const itemsToFulfill = { items: [fulfillmentUpdate] };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, fulfillOrderParams,
      itemsToFulfill, merchDistributor, conn, pickupEvent);

    // cancel the order
    const { uuid } = placedOrderResponse.order;
    await merchController.cancelMerchOrder({ uuid }, member);

    // make sure user has only been refunded 1 option worth of points
    await member.reload();
    expect(member.credits).toEqual(8000);

    // check cancelled activity
    const memberActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const orderPlacedActivity = memberActivityStream.activity[memberActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.ORDER_CANCELLED);
  });

  test('members cannot cancel other members\' orders', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const otherMember = UserFactory.fake();
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, otherMember)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // cancel order
    const { uuid } = placedOrderResponse.order;
    expect(merchController.cancelMerchOrder({ uuid }, otherMember))
      .rejects
      .toThrow('Members cannot cancel other members\' orders');
  });

  test('members cannot fulfill orders', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const option = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // attempt to fulfill the member's own order
    const placedOrder = placedOrderResponse.order;
    const uuidParams = { uuid: placedOrder.uuid };
    const fulfillMerchOrderItemsRequest = {
      items: [
        {
          uuid: placedOrder.items[0].uuid,
          fulfilled: true,
        },
      ],
    };
    expect(MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, uuidParams,
      fulfillMerchOrderItemsRequest, member, conn, pickupEvent))
      .rejects.toThrow(ForbiddenError);
  });

  test('no one can order items from archived collections', async () => {
    const conn = await DatabaseConnection.get();
    const collection = MerchFactory.fakeCollection({ archived: true });
    const option = collection.items[0].options[0];
    const orderPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const admin = UserFactory.fake({
      accessType: UserAccessType.ADMIN,
      credits: option.price,
    });
    const member = UserFactory.fake({
      accessType: UserAccessType.STANDARD,
      credits: option.price,
    });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(collection)
      .createOrderPickupEvents(orderPickupEvent)
      .write();

    const merchController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: orderPickupEvent.uuid,
    };

    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, admin))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, member))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
  });

  test('store managers, but not store distributors, can cancel all pending orders for all users', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake({ credits: 10000 });
    const member2 = UserFactory.fake({ credits: 10000 });
    const member3 = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const storeManager = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_MANAGER });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 10,
      price: 2000,
      discountPercentage: 0,
    });
    const merchItem = MerchFactory.fakeItem({
      monthlyLimit: 20,
      lifetimeLimit: 20,
      options: [affordableOption],
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    const order = [{ option: affordableOption, quantity: 1 }];

    await new PortalState()
      .createUsers(member1, member2, member3, merchDistributor, storeManager)
      .createMerchItem(merchItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member1, order, pickupEvent)
      .orderMerch(member2, order, pickupEvent)
      .orderMerch(member3, order, pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderFulfillment(member1.email, member1.firstName, anything()))
      .thenResolve();

    // fulfill member1's order, leaving the other two orders as PLACED
    const order1 = await conn.manager.findOne(OrderModel, { user: member1 }, { relations: ['items'] });
    const merchController = ControllerFactory.merchStore(conn, emailService);
    const itemsToFulfill = order1.items.map((item) => ({ uuid: item.uuid }));
    const fulfillmentParams = { uuid: order1.uuid };
    const fulfillmentRequest = { items: itemsToFulfill };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, fulfillmentParams,
      fulfillmentRequest, merchDistributor, conn, pickupEvent);

    // cancell all pending orders
    await merchController.cancelAllPendingMerchOrders(storeManager);
    // (making sure that store distributors cannot)
    expect(merchController.cancelAllPendingMerchOrders(merchDistributor))
      .rejects.toThrow(ForbiddenError);

    // refresh points
    await member1.reload();
    await member2.reload();
    await member3.reload();

    // member who's order is fulfilled shouldn't get refunded
    expect(member1.credits).toEqual(8000);
    expect(member2.credits).toEqual(10000);
    expect(member3.credits).toEqual(10000);

    const fulfilledOrder = await conn.manager.findOne(OrderModel, { user: member1 }, { relations: ['items'] });
    expect(fulfilledOrder.status).toEqual(OrderStatus.FULFILLED);

    const cancelledOrder1 = await conn.manager.findOne(OrderModel, { user: member2 }, { relations: ['items'] });
    expect(cancelledOrder1.status).toEqual(OrderStatus.CANCELLED);

    const cancelledOrder2 = await conn.manager.findOne(OrderModel, { user: member3 }, { relations: ['items'] });
    expect(cancelledOrder2.status).toEqual(OrderStatus.CANCELLED);

    // check pending order cancellation activity
    const adminActivityStream = await ControllerFactory.user(conn).getCurrentUserActivityStream(merchDistributor);
    const orderPlacedActivity = adminActivityStream.activity[adminActivityStream.activity.length - 1];
    expect(orderPlacedActivity.type).toStrictEqual(ActivityType.PENDING_ORDERS_CANCELLED);
  });

  test('only admins can get all orders while users can get their own orders', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake({ credits: 10000 });
    const member2 = UserFactory.fake({ credits: 10000 });
    const member3 = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption({
      quantity: 10,
      price: 2000,
      discountPercentage: 0,
    });
    const merchItem = MerchFactory.fakeItem({
      monthlyLimit: 20,
      lifetimeLimit: 20,
      options: [option],
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    const order = [{ option, quantity: 1 }];

    await new PortalState()
      .createUsers(member1, member2, member3, admin)
      .createMerchItem(merchItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member1, order, pickupEvent)
      .orderMerch(member2, order, pickupEvent)
      .orderMerch(member3, order, pickupEvent)
      .orderMerch(admin, order, pickupEvent)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const order1 = await merchStoreController.getMerchOrdersForCurrentUser(member1);
    expect(order1.orders.length).toBe(1);
    expect(order1.orders[0].user).toStrictEqual(member1.getPublicProfile());

    const adminOrder = await merchStoreController.getMerchOrdersForCurrentUser(admin);
    expect(adminOrder.orders.length).toBe(1);
    expect(adminOrder.orders[0].user).toStrictEqual(admin.getPublicProfile());

    const order2 = await merchStoreController.getMerchOrdersForCurrentUser(member2);
    const order3 = await merchStoreController.getMerchOrdersForCurrentUser(member3);

    const allOrders = await merchStoreController.getMerchOrdersForAllUsers(admin);
    expect(allOrders.orders)
      .toStrictEqual(expect.arrayContaining([order1.orders[0], order2.orders[0], order3.orders[0],
        adminOrder.orders[0]]));

    expect(merchStoreController.getMerchOrdersForAllUsers(member1)).rejects.toThrow(ForbiddenError);
  });

  test('unfulfilled ordered items whose order was cancelled do not count towards order limits for user', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption({
      quantity: 10,
      price: 2000,
      discountPercentage: 0,
    });
    const merchItem = MerchFactory.fakeItem({
      monthlyLimit: 2,
      lifetimeLimit: 2,
      options: [option],
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 2,
    });

    // hit the monthly and lifetime limits in first order
    const order = [{ option, quantity: 2 }];

    await new PortalState()
      .createUsers(member, admin)
      .createMerchItem(merchItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, order, pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderCancellation(anyString(), anyString(), anything()))
      .thenResolve();
    when(emailService.sendOrderConfirmation(anyString(), anyString(), anything()))
      .thenResolve();

    // cancel order
    const merchController = ControllerFactory.merchStore(conn);
    const placedOrder = await conn.manager.findOne(OrderModel, { user: member }, { relations: ['items'] });
    const cancelOrderParams = { uuid: placedOrder.uuid };
    await merchController.cancelMerchOrder(cancelOrderParams, member);

    // place order with 2 items again
    const secondOrder = [{ option: option.uuid, quantity: 2 }];
    const placeOrderRequest = { order: secondOrder, pickupEvent: pickupEvent.uuid };
    const placeMerchOrderResponse = await merchController.placeMerchOrder(placeOrderRequest, member);

    expect(placeMerchOrderResponse.error).toBeNull();
  });
});

describe('merch order pickup events', () => {
  test('past, future, and individual pickup events can be retrieved', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pastPickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().subtract(2, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
    });
    const ongoingPickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().subtract(30, 'minutes').toDate(),
      end: moment().add(30, 'minutes').toDate(),
    });
    const futurePickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().add(1, 'hour').toDate(),
      end: moment().add(2, 'hour').toDate(),
    });

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pastPickupEvent, ongoingPickupEvent, futurePickupEvent)
      .write();

    const merchController = ControllerFactory.merchStore(conn);

    const getFuturePickupEventsResponse = await merchController.getFuturePickupEvents(merchDistributor);
    expect(getFuturePickupEventsResponse.pickupEvents)
      .toEqual(expect.arrayContaining([
        ongoingPickupEvent.getPublicOrderPickupEvent(true),
        futurePickupEvent.getPublicOrderPickupEvent(true),
      ]));

    const getPastPickupEventsResponse = await merchController.getPastPickupEvents(merchDistributor);
    expect(getPastPickupEventsResponse.pickupEvents)
      .toEqual(expect.arrayContaining([
        pastPickupEvent.getPublicOrderPickupEvent(true),
      ]));

    const getPickupEventParams = { uuid: ongoingPickupEvent.uuid };
    const getOnePickupEventResponse = await merchController.getOnePickupEvent(getPickupEventParams, merchDistributor);
    expect(getOnePickupEventResponse.pickupEvent).toStrictEqual(ongoingPickupEvent.getPublicOrderPickupEvent(true));
  });

  test('pickup events can be created on valid input', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .write();

    const merchController = ControllerFactory.merchStore(conn);
    await merchController.createPickupEvent({ pickupEvent }, merchDistributor);

    const persistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent).toStrictEqual(pickupEvent);
  });

  test('pickup event creation fails if start date is later than end date', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });

    await new PortalState()
      .createUsers(merchDistributor)
      .write();

    const pickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().add(1, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
    });
    await expect(ControllerFactory.merchStore(conn).createPickupEvent({ pickupEvent }, merchDistributor))
      .rejects
      .toThrow('Order pickup event start time must come before the end time');
  });

  test('pickup events can be edited on valid input', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const editPickupEventRequest = { pickupEvent: { title: faker.datatype.hexaDecimal(10) } };
    const params = { uuid: pickupEvent.uuid };
    await ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, merchDistributor);

    const persistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent.uuid).toEqual(pickupEvent.uuid);
    expect(persistedPickupEvent.title).toEqual(editPickupEventRequest.pickupEvent.title);
  });

  test('pickup event update fails when pickup event edit\'s start date is later than end date', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const editPickupEventRequest = {
      pickupEvent: {
        start: moment().add(1, 'hour').toDate(),
        end: moment().subtract(1, 'hour').toDate(),
      },
    };
    const params = { uuid: pickupEvent.uuid };
    await expect(ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, merchDistributor))
      .rejects
      .toThrow('Order pickup event start time must come before the end time');
  });

  test('placing an order with a pickup event properly sets the pickup event\'s order', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option = MerchFactory.fakeOption();
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const persistedOrder = await conn.manager.findOne(OrderModel);
    const persistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent.orders).toHaveLength(1);
    expect(persistedPickupEvent.orders[0]).toStrictEqual(persistedOrder);
  });

  test('cancelling a pickup event sends emails to every user asking to reschedule', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake({ credits: 10000 });
    const member2 = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 2 });

    await new PortalState()
      .createUsers(member1, member2, merchDistributor)
      .createMerchItemOptions(affordableOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anyString(), anyString(), anything()))
      .thenResolve();
    when(emailService.sendOrderPickupCancelled(anyString(), anyString(), anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: affordableOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrder1 = await merchController.placeMerchOrder(placeMerchOrderRequest, member1);
    const placedOrder2 = await merchController.placeMerchOrder(placeMerchOrderRequest, member2);

    // delete pickup event
    const { uuid } = pickupEvent;
    await merchController.deletePickupEvent({ uuid }, merchDistributor);

    verify(emailService.sendOrderPickupCancelled(member1.email, member1.firstName, anything()))
      .called();
    verify(emailService.sendOrderPickupCancelled(member2.email, member2.firstName, anything()))
      .called();

    const order1Request = { uuid: placedOrder1.order.uuid };
    const order1Response = await merchController.getOneMerchOrder(order1Request, member1);
    expect(order1Response.order.status).toEqual(OrderStatus.PICKUP_CANCELLED);

    const order2Request = { uuid: placedOrder2.order.uuid };
    const order2Response = await merchController.getOneMerchOrder(order2Request, member2);
    expect(order2Response.order.status).toEqual(OrderStatus.PICKUP_CANCELLED);
  });

  test('completing a pickup event marks all unfulfilled orders as missed and prompts a reschedule', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake({ credits: 10000 });
    const member2 = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 3,
    });

    await new PortalState()
      .createUsers(member1, member2, merchDistributor)
      .createMerchItemOptions(affordableOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();
    when(emailService.sendOrderFulfillment(member1.email, member1.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderPickupMissed(member2.email, member2.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: affordableOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrder1Response = await merchController.placeMerchOrder(placeMerchOrderRequest, member1);
    const placedOrder2Response = await merchController.placeMerchOrder(placeMerchOrderRequest, member2);

    // fulfill one of the two orders
    const items = placedOrder1Response.order.items.map((item) => item.uuid);
    const { uuid: fulfilledOrderUuid } = placedOrder1Response.order;
    const fulfillOrderParams = { uuid: fulfilledOrderUuid };
    const fulfillOrderBody = { items: items.map((item) => ({ uuid: item })) };
    await MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, fulfillOrderParams,
      fulfillOrderBody, merchDistributor, conn, pickupEvent);

    // update the pickup event to have passed
    const pickupEventUuid = { uuid: pickupEvent.uuid };
    const pickupEventUpdates = {
      start: moment().subtract(1, 'day'),
      end: moment().subtract(1, 'day').add(1, 'hour'),
    };
    await conn.manager.update(OrderPickupEventModel, pickupEventUuid, pickupEventUpdates);

    // mark pickup event as complete
    await merchController.completePickupEvent(pickupEventUuid, merchDistributor);

    // check member1's order is fulfilled, and that confirmation email is sent
    const fulfilledOrder = await merchController.getOneMerchOrder({ uuid: fulfilledOrderUuid }, member1);
    expect(fulfilledOrder.order.status).toEqual(OrderStatus.FULFILLED);
    verify(emailService.sendOrderFulfillment(member1.email, member1.firstName, anything()))
      .called();

    // check member2's order is missed, and that reschedule email is sent
    const { uuid: missedOrderUuid } = placedOrder2Response.order;
    const missedOrder = await merchController.getOneMerchOrder({ uuid: missedOrderUuid }, member2);
    expect(missedOrder.order.status).toEqual(OrderStatus.PICKUP_MISSED);
    verify(emailService.sendOrderPickupMissed(member2.email, member2.firstName, anything()))
      .called();
  });

  test('members can update their orders\' pickup events if the event is more than 2 days away', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const option = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent, anotherPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // reschedule pickup event
    const orderUuid = { uuid: placedOrderResponse.order.uuid };
    const pickupEventRequest = { pickupEvent: anotherPickupEvent.uuid };
    await merchController.rescheduleOrderPickup(orderUuid, pickupEventRequest, member);
    const updatedOrderResponse = await merchController.getOneMerchOrder(orderUuid, member);

    expect(updatedOrderResponse.order.pickupEvent).toStrictEqual(anotherPickupEvent.getPublicOrderPickupEvent());
    verify(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
      .called();
  });

  test('members cannot update their orders\' pickup events if the event is less than 2 days away', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const moreRecentPickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().add(1, 'day').toDate(),
      end: moment().add(1, 'day').add(1, 'hour').toDate(),
    });

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(affordableOption)
      .createOrderPickupEvents(pickupEvent, moreRecentPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: affordableOption.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: pickupEvent.uuid,
    };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);

    // attempt to reschedule pickup event
    const orderUuid = { uuid: placedOrderResponse.order.uuid };
    const pickupEventRequest = { pickupEvent: moreRecentPickupEvent.uuid };
    expect(merchController.rescheduleOrderPickup(orderUuid, pickupEventRequest, member))
      .rejects.toThrow('Cannot change order pickup to an event that starts in less than 2 days');
  });

  test('placing an order with a pickup event that has not reached its capacity succeeds', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ points: 100 });
    const item = MerchFactory.fakeItem({
      hidden: false,
      monthlyLimit: 100,
    });
    const option = MerchFactory.fakeOption({
      item,
      quantity: 10,
      price: 10,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 5 });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      // orderMerch() needs to be called separately so as to create separate orders
      // for the provided pickup event.
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const merchController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: pickupEvent.uuid,
    };

    const placeOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);
    expect(placeOrderResponse.error).toBeNull();
    expect(placeOrderResponse.order.pickupEvent).toStrictEqual(pickupEvent.getPublicOrderPickupEvent());
  });

  test("updating a pickup event's order limit to a threshold above the current order count succeeds", async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const member = UserFactory.fake({ points: 100 });
    const option = MerchFactory.fakeOption({ price: 10 });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 5 });

    const state = new PortalState()
      .createUsers(merchDistributor, member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      // orderMerch() needs to be called separately so as to create separate orders
      // for the provided pickup event.
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent);

    await state.write();

    const editPickupEventRequest = {
      pickupEvent: {
        orderLimit: 2,
      },
    };
    const merchController = ControllerFactory.merchStore(conn);
    const params = { uuid: pickupEvent.uuid };
    await merchController.editPickupEvent(params, editPickupEventRequest, merchDistributor);

    const persistedPickupEvent = await merchController.getOnePickupEvent(params, merchDistributor);

    expect(persistedPickupEvent.pickupEvent.orderLimit).toEqual(2);
  });

  test('placing an order with a pickup event that has reached the order limit fails', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ points: 100 });
    const item = MerchFactory.fakeItem({
      hidden: false,
      monthlyLimit: 100,
    });
    const option = MerchFactory.fakeOption({
      item,
      quantity: 10,
      price: 10,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 2 });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      // orderMerch() needs to be called separately so as to create separate orders
      // for the provided pickup event.
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const merchController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: pickupEvent.uuid,
    };

    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, member))
      .rejects
      .toThrow('This merch pickup event is full! Please choose a different pickup event');
  });

  test('pickup event update fails when edit\'s order limit is decreased below the number of orders', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const member = UserFactory.fake({ points: 100 });
    const option = MerchFactory.fakeOption({ price: 10 });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 2 });

    await new PortalState()
      .createUsers(merchDistributor, member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      // orderMerch() needs to be called separately so as to create separate orders
      // for the provided pickup event.
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const editPickupEventRequest = {
      pickupEvent: {
        orderLimit: 1,
      },
    };
    const params = { uuid: pickupEvent.uuid };
    await expect(ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, merchDistributor))
      .rejects
      .toThrow('Pickup event cannot have order limit lower than the number of orders booked in it');
  });

  test('cancelled orders do not contribute to a pickup event\'s order limit', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ points: 100 });
    const option = MerchFactory.fakeOption({ price: 10 });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ orderLimit: 1 });

    await new PortalState()
      .createUsers(member)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .thenResolve();

    // cancel order
    const order = await conn.manager.findOne(OrderModel, { user: member });
    const cancelOrderParams = { uuid: order.uuid };
    const merchController = ControllerFactory.merchStore(conn);
    await merchController.cancelMerchOrder(cancelOrderParams, member)    

    // re-place order, making sure its successful
    const reorderDetails = [{ option: option.uuid, quantity: 1}];
    const placeOrderParams = { order: reorderDetails, pickupEvent: pickupEvent.uuid };
    const placeOrderResponse = await merchController.placeMerchOrder(placeOrderParams, member);
    expect(placeOrderResponse.error).toBeNull();
  });
});
