import * as faker from 'faker';
import * as moment from 'moment';
import { OrderModel } from '../models/OrderModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { UserAccessType } from '../types';
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

  });

  test('members can cancel orders that they\'ve placed and receive a full refund to their order', async () => {

  });

  test('admins can fulfill parts of a member\'s order', async () => {

  });

  test('admins can fulfill entire orders if every item of a member\'s order is fulfilled', async () => {

  });

  test('members cannot fulfill orders', async () => {

  });

  test('members cannot order items from archived collections', async () => {
    const conn = await DatabaseConnection.get();
    const collection = MerchFactory.fakeCollection({ archived: true });
    const option = collection.items[0].options[0];
    const orderPickupEvent = MerchFactory.fakeOrderPickupEvent();
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
    const pickupEvent = MerchFactory.fakeOrderPickupEvent();

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

  test('cancelling a pickup event refunds every order for that event to the respective user', async () => {

  });

  test('members can reschedule their pickup event if they miss the event', async () => {

  });
});
