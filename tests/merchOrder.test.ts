import * as faker from 'faker';
import * as moment from 'moment';
import { mock, when, anything, instance, verify, anyString } from 'ts-mockito';
import { ForbiddenError } from 'routing-controllers';
import EmailService from '../services/EmailService';
import { OrderModel } from '../models/OrderModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { UserAccessType, OrderStatus } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, MerchFactory, PortalState, UserFactory } from './data';

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
    const affordableOption1 = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const affordableOption2 = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption1)
      .createMerchItemOption(affordableOption2)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    const order = [
      {
        option: affordableOption1.uuid,
        quantity: 1,
      },
      {
        option: affordableOption2.uuid,
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
    expect(member.credits).toEqual(5000);
    verify(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .called();
  });

  test('members can cancel orders that they\'ve placed and receive a full refund to their order', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption)
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

    // cancel order
    const { uuid } = placedOrderResponse.order;
    await merchController.cancelMerchOrder({ uuid }, member);

    // get order, making sure state was updated and user has been refunded
    const cancelledOrderResponse = await merchController.getOneMerchOrder({ uuid }, member);
    const cancelledOrder = cancelledOrderResponse.order;

    expect(cancelledOrder.status).toEqual(OrderStatus.CANCELLED);
    expect(member.credits).toEqual(10000);
    verify(emailService.sendOrderCancellation(member.email, member.firstName, anything()))
      .called();
  });

  test('members cannot cancel other members\' orders', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const otherMember = UserFactory.fake();
    const affordableOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
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

    // cancel order
    const { uuid } = placedOrderResponse.order;
    expect(merchController.cancelMerchOrder({ uuid }, otherMember))
      .rejects
      .toThrow('Member cannot cancel other members\' orders');
  });

  test('admins can fulfill parts of a member\'s order', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const affordableOption1 = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const affordableOption2 = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption1)
      .createMerchItemOption(affordableOption2)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: affordableOption1.uuid,
        quantity: 1,
      },
      {
        option: affordableOption2.uuid,
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
    await merchController.fulfillMerchOrderItems(orderParams, fulfillMerchOrderItemsRequest, admin);

    const getOrderResponse = await merchController.getOneMerchOrder(orderParams, member);
    const partiallyFulfilledOrder = getOrderResponse.order;

    // order status should not be FULFILLED because entire order isn't fulfilled
    expect(partiallyFulfilledOrder.status).toEqual(OrderStatus.PLACED);
    expect(partiallyFulfilledOrder.items.some((item) => item.fulfilled)).toBeTruthy();
    expect(partiallyFulfilledOrder.items.every((item) => item.fulfilled)).toBeFalsy();
  });

  test('admins can fulfill entire orders if every item of a member\'s order is fulfilled', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const affordableOption1 = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const affordableOption2 = MerchFactory.fakeOption({
      quantity: 1,
      price: 3000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption1)
      .createMerchItemOption(affordableOption2)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();

    // place order
    const order = [
      {
        option: affordableOption1.uuid,
        quantity: 1,
      },
      {
        option: affordableOption2.uuid,
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
    await merchController.fulfillMerchOrderItems(uuidParams, fulfillMerchOrderItemsRequest, admin);

    const getOrderResponse = await merchController.getOneMerchOrder(uuidParams, member);
    const fulfilledOrder = getOrderResponse.order;

    expect(fulfilledOrder.status).toEqual(OrderStatus.FULFILLED);
    expect(fulfilledOrder.items[0].fulfilled).toBeTruthy();
    expect(fulfilledOrder.items[1].fulfilled).toBeTruthy();
  });

  test('members cannot fulfill orders', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 1,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
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
    expect(merchController.fulfillMerchOrderItems(uuidParams, fulfillMerchOrderItemsRequest, member))
      .rejects.toThrow(ForbiddenError);
  });

  test('members cannot order items from archived collections', async () => {
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

    const merchStoreController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: orderPickupEvent.uuid,
    };

    await expect(merchStoreController.placeMerchOrder(placeMerchOrderRequest, admin))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
    await expect(merchStoreController.placeMerchOrder(placeMerchOrderRequest, member))
      .rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
  });
});

describe('merch order pickup events', () => {
  test('future pickup events can be retrieved', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
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
      .createUsers(admin)
      .createOrderPickupEvents(pastPickupEvent, ongoingPickupEvent, futurePickupEvent)
      .write();

    const getFuturePickupEventsResponse = await ControllerFactory.merchStore(conn).getFuturePickupEvents(admin);
    expect(getFuturePickupEventsResponse.pickupEvents)
      .toEqual(expect.arrayContaining([
        ongoingPickupEvent.getPublicOrderPickupEvent(true),
        futurePickupEvent.getPublicOrderPickupEvent(true),
      ]));
  });

  test('pickup events can be created on valid input', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(admin)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.createPickupEvent({ pickupEvent }, admin);

    const [persistedPickupEvent] = await conn.manager.find(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent).toStrictEqual(pickupEvent);
  });

  test('pickup event creation fails if start date is later than end date', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers(admin)
      .write();

    const pickupEvent = MerchFactory.fakeOrderPickupEvent({
      start: moment().add(1, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
    });
    await expect(ControllerFactory.merchStore(conn).createPickupEvent({ pickupEvent }, admin))
      .rejects
      .toThrow('Order pickup event start time must come before the end time');
  });

  test('pickup events can be edited on valid input', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(admin)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const editPickupEventRequest = { pickupEvent: { title: faker.datatype.hexaDecimal(10) } };
    const params = { uuid: pickupEvent.uuid };
    await ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, admin);

    const [persistedPickupEvent] = await conn.manager.find(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent.uuid).toEqual(pickupEvent.uuid);
    expect(persistedPickupEvent.title).toEqual(editPickupEventRequest.pickupEvent.title);
  });

  test('pickup event update fails when pickup event edit\'s start date is later than end date', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

    await new PortalState()
      .createUsers(admin)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const editPickupEventRequest = {
      pickupEvent: {
        start: moment().add(1, 'hour').toDate(),
        end: moment().subtract(1, 'hour').toDate(),
      },
    };
    const params = { uuid: pickupEvent.uuid };
    await expect(ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, admin))
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
      .createMerchItemOption(option)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const [persistedOrder] = await conn.manager.find(OrderModel);
    const [persistedPickupEvent] = await conn.manager.find(OrderPickupEventModel, { relations: ['orders'] });
    expect(persistedPickupEvent.orders).toHaveLength(1);
    expect(persistedPickupEvent.orders[0]).toStrictEqual(persistedOrder);
  });

  test('cancelling a pickup event sends emails to every user asking to reschedule', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake({ credits: 10000 });
    const member2 = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member1, member2)
      .createMerchItemOption(affordableOption)
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
    await merchController.deletePickupEvent({ uuid }, admin);

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

  test('members get pickup rescheduling emails for their orders if they miss the event', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption)
      .createOrderPickupEvents(pickupEvent)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendOrderConfirmation(member.email, member.firstName, anything()))
      .thenResolve();
    when(emailService.sendOrderPickupMissed(member.email, member.firstName, anything()))
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

    // update pickup event to have passed
    const pickupEventUuid = { uuid: pickupEvent.uuid };
    const pickupEventUpdates = {
      start: moment().subtract(1, 'day'),
      end: moment().subtract(1, 'day').add(1, 'hour'),
    };
    await conn.manager.update(OrderPickupEventModel, pickupEventUuid, pickupEventUpdates);

    // mark order as missed and check if reschedule email is sent
    const { uuid } = placedOrderResponse.order;
    await merchController.markOrderAsMissed({ uuid }, admin);
    const updatedOrder = await merchController.getOneMerchOrder({ uuid }, member);

    expect(updatedOrder.order.status).toEqual(OrderStatus.PICKUP_MISSED);
    verify(emailService.sendOrderPickupMissed(member.email, member.firstName, anything()))
      .called();
  });

  test('members can update their orders\' pickup events if the event is more than 2 days away', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({ credits: 10000 });
    const affordableOption = MerchFactory.fakeOption({
      quantity: 2,
      price: 2000,
      discountPercentage: 0,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();
    const anotherPickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItemOption(affordableOption)
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

    // reschedule pickup event
    const orderUuid = { uuid: placedOrderResponse.order.uuid };
    const pickupEventRequest = { pickupEvent: anotherPickupEvent.uuid };
    await merchController.editMerchOrderPickup(orderUuid, pickupEventRequest, member);
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
      .createMerchItemOption(affordableOption)
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
    expect(merchController.editMerchOrderPickup(orderUuid, pickupEventRequest, member))
      .rejects.toThrow('Cannot change order pickup to an event that starts in less than 2 days');
  });
});
