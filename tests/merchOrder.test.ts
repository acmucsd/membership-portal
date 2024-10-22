import * as faker from 'faker';
import * as moment from 'moment';
import { mock, when, anything, instance, verify, anyString } from 'ts-mockito';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import EmailService from '../services/EmailService';
import { OrderModel } from '../models/OrderModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { UserAccessType, OrderStatus, ActivityType, OrderPickupEventStatus } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, MerchFactory, PortalState, UserFactory } from './data';
import { MerchStoreControllerWrapper } from './controllers/MerchStoreControllerWrapper';
import { UserModel } from '../models/UserModel';

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

  test('merch items can be fulfilled for ongoing and past pickup events', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pastPickupEvent = MerchFactory.fakePastOrderPickupEvent();
    const ongoingPickupEvent = MerchFactory.fakeOngoingOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pastPickupEvent, ongoingPickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pastPickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], ongoingPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderFulfillment(member.email, member.firstName, anything()))
      .thenResolve();

    const pastOrder = await conn.manager.findOne(OrderModel,
      { pickupEvent: pastPickupEvent },
      { relations: ['items'] });
    const ongoingOrder = await conn.manager.findOne(OrderModel,
      { pickupEvent: ongoingPickupEvent },
      { relations: ['items'] });

    // fulfill past order
    const pastOrderUuid = { uuid: pastOrder.uuid };
    const fulfillPastOrderItemsRequest = {
      items: [
        {
          uuid: pastOrder.items[0].uuid,
        },
      ],
    };

    const merchStoreController = ControllerFactory.merchStore(conn, emailService);
    await merchStoreController.fulfillMerchOrderItems(pastOrderUuid, fulfillPastOrderItemsRequest, merchDistributor);

    await pastOrder.reload();
    expect(pastOrder.status).toEqual(OrderStatus.FULFILLED);

    // fulfill ongoing order
    const ongoingOrderUuid = { uuid: ongoingOrder.uuid };
    const fulfillOngoingOrderItemsRequest = {
      items: [
        {
          uuid: ongoingOrder.items[0].uuid,
        },
      ],
    };

    await merchStoreController.fulfillMerchOrderItems(ongoingOrderUuid,
      fulfillOngoingOrderItemsRequest,
      merchDistributor);

    await ongoingOrder.reload();
    expect(ongoingOrder.status).toEqual(OrderStatus.FULFILLED);
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
    const cancelOrderResponse = await merchController.cancelMerchOrder({ uuid }, member);
    expect(cancelOrderResponse.order.uuid).toEqual(uuid);

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
    const cancelOrderResponse = await merchController.cancelMerchOrder({ uuid }, member);
    expect(cancelOrderResponse.order.uuid).toEqual(uuid);

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
    await expect(merchController.cancelMerchOrder({ uuid }, otherMember))
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
    await expect(MerchStoreControllerWrapper.fulfillMerchOrderItems(merchController, uuidParams,
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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: orderPickupEvent.uuid,
    };

    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, admin))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, member))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
  });

  test('order route accurately verifies monthly and lifetime limits', async () => {
    const conn = await DatabaseConnection.get();
    const optionMetadataType = faker.datatype.hexaDecimal(10);
    const option1 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option2 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option3 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option4 = MerchFactory.fakeOptionWithType(optionMetadataType);

    const item = MerchFactory.fakeItem({
      options: [option1, option2],
      monthlyLimit: 1,
      lifetimeLimit: 1,
    });
    const item2 = MerchFactory.fakeItem({
      options: [option3, option4],
      monthlyLimit: 1,
      lifetimeLimit: 2,
    });

    const orderPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const member = UserFactory.fake({
      accessType: UserAccessType.STANDARD,
      credits: option1.price + option2.price + option3.price + option4.price,
    });

    await new PortalState()
      .createUsers(member)
      .createOrderPickupEvents(orderPickupEvent)
      .createMerchItem(item)
      .createMerchItem(item2)
      .write();

    await member.reload();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    // Test Lifetime limit
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placeMerchOrderRequest = {
      order: [{ option: option1.uuid, quantity: 1 }, { option: option2.uuid, quantity: 1 }],
      pickupEvent: orderPickupEvent.uuid,
    };

    await expect(merchController.placeMerchOrder(placeMerchOrderRequest, member)).rejects.toThrowError(
      `This order exceeds the lifetime limit for ${item.itemName}`,
    );

    // Test Monthly limit
    const placeMerchOrderRequest2 = {
      order: [{ option: option3.uuid, quantity: 1 }, { option: option4.uuid, quantity: 1 }],
      pickupEvent: orderPickupEvent.uuid,
    };

    await expect(merchController.placeMerchOrder(placeMerchOrderRequest2, member)).rejects.toThrowError(
      `This order exceeds the monthly limit for ${item2.itemName}`,
    );
  });

  test('store managers, but not store distributors, can cancel all pending orders for all users', async () => {
    const conn = await DatabaseConnection.get();
    const members = UserFactory.create(6).map((member) => UserModel.merge(member, { credits: 10000 }));
    const [placedOrderMember, cancelledOrderMember, fulfilledOrderMember,
      partiallyFulfilledOrderMember, pickupCancelledMember, pickupMissedMember] = members;
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
      .createUsers(...members, merchDistributor, storeManager)
      .createMerchItem(merchItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(placedOrderMember, order, pickupEvent)
      .orderMerch(cancelledOrderMember, order, pickupEvent)
      .orderMerch(fulfilledOrderMember, order, pickupEvent)
      .orderMerch(partiallyFulfilledOrderMember, order, pickupEvent)
      .orderMerch(pickupCancelledMember, order, pickupEvent)
      .orderMerch(pickupMissedMember, order, pickupEvent)
      .write();

    // change order statuses of orders to every possible order status
    await conn.manager.update(OrderModel, { user: cancelledOrderMember }, { status: OrderStatus.CANCELLED });
    await conn.manager.update(OrderModel, { user: fulfilledOrderMember }, { status: OrderStatus.FULFILLED });
    await conn.manager.update(OrderModel, { user: partiallyFulfilledOrderMember },
      { status: OrderStatus.PARTIALLY_FULFILLED });
    await conn.manager.update(OrderModel, { user: pickupCancelledMember }, { status: OrderStatus.PICKUP_CANCELLED });
    await conn.manager.update(OrderModel, { user: pickupMissedMember }, { status: OrderStatus.PICKUP_MISSED });

    const emailService = mock(EmailService);
    when(emailService.sendAutomatedOrderCancellation(anything(), anything(), anything()))
      .thenResolve();

    // cancel all pending orders
    const merchController = ControllerFactory.merchStore(conn, emailService);
    await merchController.cancelAllPendingMerchOrders(storeManager);
    // (making sure that store distributors cannot)
    await expect(merchController.cancelAllPendingMerchOrders(merchDistributor))
      .rejects.toThrow(ForbiddenError);

    await Promise.all(members.map(async (member) => {
      await member.reload();
      // members whose orders were previously fulfilled, cancelled, or placed shouldn't get refunded,
      // whereas all other members should
      if (member === fulfilledOrderMember || member === cancelledOrderMember || member === placedOrderMember) {
        expect(member.credits).toEqual(8000);
      } else {
        expect(member.credits).toEqual(10000);
      }
      // orders that were fulfilled should remain fulfilled,
      // placed orders should remain placed,
      // and all other orders should be cancelled
      const updatedOrder = await conn.manager.findOne(OrderModel, { user: member });
      if (member === fulfilledOrderMember) {
        expect(updatedOrder.status).toEqual(OrderStatus.FULFILLED);
      } else if (member === placedOrderMember) {
        expect(updatedOrder.status).toEqual(OrderStatus.PLACED);
      } else {
        expect(updatedOrder.status).toEqual(OrderStatus.CANCELLED);
      }
    }));

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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchStoreController = ControllerFactory.merchStore(conn, instance(emailService));
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

    await expect(merchStoreController.getMerchOrdersForAllUsers(member1)).rejects.toThrow(ForbiddenError);
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
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrder = await conn.manager.findOne(OrderModel, { user: member }, { relations: ['items'] });
    const cancelOrderParams = { uuid: placedOrder.uuid };
    const cancelOrderResponse = await merchController.cancelMerchOrder(cancelOrderParams, member);
    expect(cancelOrderResponse.order.uuid).toEqual(cancelOrderParams.uuid);

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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));

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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.createPickupEvent({ pickupEvent }, merchDistributor);

    const persistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel,
      { relations: ['orders', 'linkedEvent'] });
    expect(persistedPickupEvent).toStrictEqual(pickupEvent);
  });

  test('pickup events can be linked to normal events & edited', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const linkedEvent = EventFactory.fake();
    const eventController = ControllerFactory.event(conn);
    await eventController.createEvent({ event: linkedEvent }, admin);

    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent({ linkedEvent });

    await new PortalState()
      .createUsers(merchDistributor)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const createPickupEventRequest = { pickupEvent: { ...pickupEvent, linkedEventUuid: linkedEvent.uuid } };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.createPickupEvent(createPickupEventRequest, merchDistributor);

    const persistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel,
      { relations: ['orders', 'linkedEvent'] });

    console.log(persistedPickupEvent);
    console.log(pickupEvent);
    expect(persistedPickupEvent).toStrictEqual(pickupEvent);

    // edit a linked event

    const newLinkedEvent = EventFactory.fake();
    await eventController.createEvent({ event: newLinkedEvent }, admin);

    const editPickupEventRequest = { pickupEvent: { linkedEventUuid: newLinkedEvent.uuid } };
    const params = { uuid: pickupEvent.uuid };
    await merchController.editPickupEvent(params, editPickupEventRequest, merchDistributor);

    const editedPersistedPickupEvent = await conn.manager.findOne(OrderPickupEventModel,
      { relations: ['orders', 'linkedEvent'] });
    expect(editedPersistedPickupEvent.uuid).toEqual(pickupEvent.uuid);
    expect(editedPersistedPickupEvent.linkedEvent.uuid).toEqual(editPickupEventRequest.pickupEvent.linkedEventUuid);
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

  test('pickup events can be deleted if they have no orders scheduled for it', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const params = { uuid: pickupEvent.uuid };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.deletePickupEvent(params, merchDistributor);

    // make sure pickup event cannot be retrieved
    await (expect(merchController.getOnePickupEvent(params, merchDistributor)))
      .rejects.toThrow(NotFoundError);
  });

  test('pickup events cannot be deleted if they have orders scheduled for it', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const option = MerchFactory.fakeOption({ price: 2000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [{ option: option.uuid, quantity: 1 }];
    const placeOrderRequest = { order, pickupEvent: pickupEvent.uuid };
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.placeMerchOrder(placeOrderRequest, member);

    // attempt to delete event
    const params = { uuid: pickupEvent.uuid };
    await (expect(merchController.deletePickupEvent(params, merchDistributor)))
      .rejects.toThrow('Cannot delete a pickup event that has order pickups scheduled for it');
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

    // cancel pickup event
    const { uuid } = pickupEvent;
    const pickupEventUuid = { uuid };
    await merchController.cancelPickupEvent(pickupEventUuid, merchDistributor);

    verify(emailService.sendOrderPickupCancelled(member1.email, member1.firstName, anything()))
      .called();
    verify(emailService.sendOrderPickupCancelled(member2.email, member2.firstName, anything()))
      .called();

    // check order statuses have been updated
    const order1Request = { uuid: placedOrder1.order.uuid };
    const order1Response = await merchController.getOneMerchOrder(order1Request, member1);
    expect(order1Response.order.status).toEqual(OrderStatus.PICKUP_CANCELLED);

    const order2Request = { uuid: placedOrder2.order.uuid };
    const order2Response = await merchController.getOneMerchOrder(order2Request, member2);
    expect(order2Response.order.status).toEqual(OrderStatus.PICKUP_CANCELLED);

    // check pickup event's status has been updated
    const completedPickupEvent = await merchController.getOnePickupEvent(pickupEventUuid, merchDistributor);
    expect(completedPickupEvent.pickupEvent.status).toEqual(OrderPickupEventStatus.CANCELLED);
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
      start: moment().startOf('day').toDate(),
      end: moment().startOf('day').add(2, 'hours').toDate(),
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

    // check pickup event's status has been updated
    const completedPickupEvent = await merchController.getOnePickupEvent(pickupEventUuid, merchDistributor);
    expect(completedPickupEvent.pickupEvent.status).toEqual(OrderPickupEventStatus.COMPLETED);
  });

  test('past pickup events can be completed', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEventToComplete = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEventToComplete)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderPickupCancelled(anything(), anything(), anything()))
      .thenResolve();

    // update the pickup events to have passed yesterday
    const completedPickupEventUuid = { uuid: pickupEventToComplete.uuid };
    const pickupEventUpdates = {
      start: moment().subtract(1, 'day').startOf('day').toDate(),
      end: moment().subtract(1, 'day').startOf('day').add(2, 'hours')
        .toDate(),
    };
    await conn.manager.update(OrderPickupEventModel, completedPickupEventUuid, pickupEventUpdates);

    // mark pickup event as complete
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.completePickupEvent(completedPickupEventUuid, merchDistributor);

    // check pickup event's status has been updated
    const completedPickupEvent = await merchController.getOnePickupEvent(completedPickupEventUuid, merchDistributor);
    expect(completedPickupEvent.pickupEvent.status).toEqual(OrderPickupEventStatus.COMPLETED);
  });

  test('distributors cannot complete a pickup event before the event starts', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEventToComplete = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEventToComplete)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderPickupMissed(anything(), anything(), anything()))
      .thenResolve();

    // update the pickup event to be 1 hour from now
    const completedPickupEventUuid = { uuid: pickupEventToComplete.uuid };
    const pickupEventUpdates = {
      start: moment().add(1, 'hours').toDate(),
      end: moment().add(3, 'hours').toDate(),
    };
    await conn.manager.update(OrderPickupEventModel, completedPickupEventUuid, pickupEventUpdates);

    // mark pickup event as complete
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));

    await expect(merchController.completePickupEvent(completedPickupEventUuid, merchDistributor))
      .rejects.toThrow('Cannot complete a pickup event that\'s hasn\'t happened yet');
  });

  test('distributors can complete a pickup event during or after the event', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const ongoingPickupEvent = MerchFactory.fakeOngoingOrderPickupEvent();
    const pastPickupEvent = MerchFactory.fakePastOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(ongoingPickupEvent, pastPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderPickupMissed(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));

    const ongoingPickupEventUuid = { uuid: ongoingPickupEvent.uuid };
    await merchController.completePickupEvent(ongoingPickupEventUuid, merchDistributor);

    const completedOngoingPickupEvent = await conn.manager.findOne(OrderPickupEventModel,
      { uuid: ongoingPickupEvent.uuid });
    expect(completedOngoingPickupEvent.status).toEqual(OrderPickupEventStatus.COMPLETED);

    const pastPickupEventUuid = { uuid: pastPickupEvent.uuid };
    await merchController.completePickupEvent(pastPickupEventUuid, merchDistributor);

    const completedPastPickupEvent = await conn.manager.findOne(OrderPickupEventModel, { uuid: pastPickupEvent.uuid });
    expect(completedPastPickupEvent.status).toEqual(OrderPickupEventStatus.COMPLETED);
  });

  test('pickup events that have previously been completed/cancelled cannot be completed/cancelled again', async () => {
    const conn = await DatabaseConnection.get();
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const pickupEventToComplete = MerchFactory.fakeFutureOrderPickupEvent();
    const pickupEventToCancel = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(merchDistributor)
      .createOrderPickupEvents(pickupEventToComplete, pickupEventToCancel)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderPickupCancelled(anything(), anything(), anything()))
      .thenResolve();

    // update the pickup events to have passed
    const cancelledPickupEventUuid = { uuid: pickupEventToCancel.uuid };
    const completedPickupEventUuid = { uuid: pickupEventToComplete.uuid };
    const pickupEventUpdates = {
      start: moment().startOf('day').toDate(),
      end: moment().startOf('day').add(2, 'hours').toDate(),
    };
    await conn.manager.update(OrderPickupEventModel, cancelledPickupEventUuid, pickupEventUpdates);
    await conn.manager.update(OrderPickupEventModel, completedPickupEventUuid, pickupEventUpdates);

    // mark pickup event as complete
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.completePickupEvent(completedPickupEventUuid, merchDistributor);

    // mark pickup event as cancelled
    await merchController.cancelPickupEvent(cancelledPickupEventUuid, merchDistributor);

    // attempt to mark the completed event as complete again
    await expect(merchController.completePickupEvent(completedPickupEventUuid, merchDistributor))
      .rejects.toThrow('Cannot complete a pickup event that isn\'t currently active');

    // attempt to mark the completed event as cancelled
    await expect(merchController.cancelPickupEvent(completedPickupEventUuid, merchDistributor))
      .rejects.toThrow('Cannot cancel a pickup event that isn\'t currently active');

    // attempt to mark the cancelled event as complete
    await expect(merchController.completePickupEvent(cancelledPickupEventUuid, merchDistributor))
      .rejects.toThrow('Cannot complete a pickup event that isn\'t currently active');

    // attempt to mark the cancelled event as cancelled
    await expect(merchController.cancelPickupEvent(cancelledPickupEventUuid, merchDistributor))
      .rejects.toThrow('Cannot cancel a pickup event that isn\'t currently active');
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

  test('members can reschedule their pickup after an event has ended if they missed it', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
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

    // update the pickup event to have passed
    const pickupEventUuid = { uuid: pickupEvent.uuid };
    const pickupEventUpdates = {
      start: moment().startOf('day').toDate(),
      end: moment().startOf('day').add(2, 'hours').toDate(),
    };
    await conn.manager.update(OrderPickupEventModel, pickupEventUuid, pickupEventUpdates);

    // complete the event, marking the above order as missed
    await merchController.completePickupEvent(pickupEventUuid, merchDistributor);

    // reschedule the missed order's pickup
    const orderUuid = { uuid: placedOrderResponse.order.uuid };
    const pickupEventRequest = { pickupEvent: anotherPickupEvent.uuid };
    await merchController.rescheduleOrderPickup(orderUuid, pickupEventRequest, member);
    const updatedOrderResponse = await merchController.getOneMerchOrder(orderUuid, member);

    expect(updatedOrderResponse.order.pickupEvent).toStrictEqual(anotherPickupEvent.getPublicOrderPickupEvent());
    verify(emailService.sendOrderPickupUpdated(member.email, member.firstName, anything()))
      .called();
  });

  test('members can reschedule their pickup if their current pickup event is cancelled', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const merchDistributor = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });
    const option = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member, merchDistributor)
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

    // update the pickup event to be 1 day away
    const pickupEventUuid = { uuid: pickupEvent.uuid };
    const pickupEventUpdates = {
      start: moment().add(1, 'day').toDate(),
      end: moment().add(1, 'day').add(1, 'hour').toDate(),
    };
    await conn.manager.update(OrderPickupEventModel, pickupEventUuid, pickupEventUpdates);

    // cancel the event, marking the above order as PICKUP_CANCELLED
    await merchController.cancelPickupEvent(pickupEventUuid, merchDistributor);

    // reschedule the order's pickup
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
    await expect(merchController.rescheduleOrderPickup(orderUuid, pickupEventRequest, member))
      .rejects.toThrow('Cannot change order pickup to an event that starts in less than 2 days');
  });

  test('members cannot update their orders\' pickup events if the new pickup event is full', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const item = MerchFactory.fakeItem({
      hidden: false,
      monthlyLimit: 100,
    });
    const option = MerchFactory.fakeOption({
      item,
      quantity: 2,
      price: 2000,
    });
    const firstPickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 1,
    });

    const secondPickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 1,
    });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(firstPickupEvent, secondPickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], firstPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order to secondPickupEvent
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: secondPickupEvent.uuid,
    };

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);
    const placedOrder = placedOrderResponse.order;

    // attempt to reschedule to firstPickupEvent
    const orderParams = { uuid: placedOrder.uuid };
    const newPickupEventParams = { pickupEvent: firstPickupEvent.uuid };
    await expect(merchController.rescheduleOrderPickup(orderParams, newPickupEventParams, member))
      .rejects
      .toThrow('This merch pickup event is full! Please choose a different pickup event');
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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const params = { uuid: pickupEvent.uuid };
    await merchController.editPickupEvent(params, editPickupEventRequest, merchDistributor);

    const persistedPickupEvent = await merchController.getOnePickupEvent(params, merchDistributor);

    expect(persistedPickupEvent.pickupEvent.orderLimit).toEqual(2);
  });

  test('members cannot update their orders\' pickup events if the new pickup event is full', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const item = MerchFactory.fakeItem({
      hidden: false,
      monthlyLimit: 100,
    });
    const option = MerchFactory.fakeOption({
      item,
      quantity: 2,
      price: 2000,
    });
    const firstPickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 1,
    });

    const secondPickupEvent = MerchFactory.fakeFutureOrderPickupEvent({
      orderLimit: 1,
    });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItemOptions(option)
      .createOrderPickupEvents(firstPickupEvent, secondPickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], firstPickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order to secondPickupEvent
    const order = [
      {
        option: option.uuid,
        quantity: 1,
      },
    ];
    const placeMerchOrderRequest = {
      order,
      pickupEvent: secondPickupEvent.uuid,
    };

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    const placedOrderResponse = await merchController.placeMerchOrder(placeMerchOrderRequest, member);
    const placedOrder = placedOrderResponse.order;

    // attempt to reschedule to firstPickupEvent
    const orderParams = { uuid: placedOrder.uuid };
    const newPickupEventParams = { pickupEvent: firstPickupEvent.uuid };
    await expect(merchController.rescheduleOrderPickup(orderParams, newPickupEventParams, member))
      .rejects
      .toThrow('This merch pickup event is full! Please choose a different pickup event');
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

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(anything(), anything(), anything()))
      .thenResolve();

    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
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
    const merchController = ControllerFactory.merchStore(conn, instance(emailService));
    await merchController.cancelMerchOrder(cancelOrderParams, member);

    // re-place order, making sure its successful
    const reorderDetails = [{ option: option.uuid, quantity: 1 }];
    const placeOrderParams = { order: reorderDetails, pickupEvent: pickupEvent.uuid };
    const placeOrderResponse = await merchController.placeMerchOrder(placeOrderParams, member);
    expect(placeOrderResponse.error).toBeNull();
  });
});
