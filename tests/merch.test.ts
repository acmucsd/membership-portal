import * as faker from 'faker';
import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { zip } from 'underscore';
import { OrderModel } from '../models/OrderModel';
import { OrderPickupEventModel } from '../models/OrderPickupEventModel';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';
import { MerchItemEdit, UserAccessType } from '../types';
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

describe('editing merch collections', () => {
  test('only admins can edit merch collections', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const collection = MerchFactory.fakeCollection();

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: collection.uuid };
    const editMerchCollectionRequest = { collection: { title: faker.datatype.hexaDecimal(10) } };

    await expect(merchStoreController.editMerchCollection(params, editMerchCollectionRequest, member))
      .rejects.toThrow(ForbiddenError);

    const editMerchCollectionResponse = await merchStoreController
      .editMerchCollection(params, editMerchCollectionRequest, admin);
    expect(editMerchCollectionResponse.collection.uuid).toEqual(collection.uuid);
    expect(editMerchCollectionResponse.collection.title).toEqual(editMerchCollectionRequest.collection.title);
  });
});

describe('archived merch collections', () => {
  test('only admins can view archived collections', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const collection = MerchFactory.fakeCollection({ archived: true });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(collection)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: collection.uuid };

    await expect(merchStoreController.getOneMerchCollection(params, member))
      .rejects.toThrow(ForbiddenError);

    const getMerchCollectionResponse = await merchStoreController.getOneMerchCollection(params, admin);
    expect(getMerchCollectionResponse.collection.uuid).toEqual(collection.uuid);
  });

  test('ordering items from archived collections is not allowed', async () => {
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

describe('merch items with no options', () => {
  test('can delete all item options and add back options if the item is hidden', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hidden: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    // delete all options from the merch item
    for (let i = 0; i < item.options.length; i += 1) {
      const optionParams = { uuid: item.options[i].uuid };
      await merchStoreController.deleteMerchItemOption(optionParams, admin);
    }

    const itemParams = { uuid: item.uuid };
    let getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(0);

    // add back the same options
    for (let i = 0; i < item.options.length; i += 1) {
      const createMerchItemOptionRequest = { option: item.options[i] };
      await merchStoreController.createMerchItemOption(itemParams, createMerchItemOptionRequest, admin);
    }

    getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(item.options.length);
  });

  test('cannot delete all item options if the item is visible', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hidden: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    // delete all but one options from the merch item
    for (let i = 1; i < item.options.length; i += 1) {
      const optionParams = { uuid: item.options[i].uuid };
      await merchStoreController.deleteMerchItemOption(optionParams, admin);
    }

    // should fail to delete the only remaining option
    await expect(merchStoreController.deleteMerchItemOption({ uuid: item.options[0].uuid }, admin))
      .rejects.toThrow('Cannot delete the only option for a visible merch item');

    const itemParams = { uuid: item.uuid };
    const getMerchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(1);
  });

  test('cannot update an item with no options to be visible', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({
      hidden: true,
      hasVariantsEnabled: true,
      options: [],
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { hidden: false } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Item cannot be set to visible if it has 0 options.');
  });
});

describe('merch item edits', () => {
  test('succeeds when item fields are updated', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem();

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // update the description and increment the purchase limits
    const merchItemEdits: MerchItemEdit = {
      description: faker.datatype.hexaDecimal(10),
      monthlyLimit: item.monthlyLimit + 1,
      lifetimeLimit: item.lifetimeLimit + 1,
    };
    const editMerchItemRequest = { merchandise: merchItemEdits };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.description).toEqual(merchItemEdits.description);
    expect(getMerchItemResponse.item.monthlyLimit).toEqual(merchItemEdits.monthlyLimit);
    expect(getMerchItemResponse.item.lifetimeLimit).toEqual(merchItemEdits.lifetimeLimit);
  });

  test('succeeds when item option fields are updated', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // make small updates to all the options in an item
    const optionUpdates = item.options.map((o) => ({
      uuid: o.uuid,
      price: o.price + 50,
      quantityToAdd: 5,
      discountPercentage: o.discountPercentage + 5,
    }));

    const editMerchItemRequest = { merchandise: { options: optionUpdates } };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);

    // combine the original options and their updates
    const updatedOptions = zip(item.options, optionUpdates).map(([original, update]) => ({
      uuid: original.uuid,
      quantity: original.quantity + update.quantityToAdd,
      price: update.price,
      discountPercentage: update.discountPercentage,
      metadata: original.metadata,
    }));

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.options)
      .toEqual(expect.arrayContaining(updatedOptions));
  });

  test('fails when updated options have multiple types', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    // change only one option's type to a different one
    item.options[0].metadata.type = faker.datatype.hexaDecimal(10);

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { options: item.options } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch items cannot have multiple option types');
  });

  test('succeeds when updated options have same type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // change every option's type to a different but consistent one
    const type = faker.datatype.hexaDecimal(10);
    const updatedOptions = item.options.map((o) => MerchandiseItemOptionModel.merge(o, {
      metadata: {
        type,
        position: o.metadata.position,
        value: o.metadata.value,
      },
    }));

    const editMerchItemRequest = { merchandise: { options: updatedOptions } };
    await merchStoreController.editMerchItem(params, editMerchItemRequest, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem(params, admin);

    const publicUpdatedOptions = updatedOptions.map((o) => o.getPublicMerchItemOption(true));
    expect(merchItemResponse.item.options)
      .toEqual(expect.arrayContaining(publicUpdatedOptions));
  });
});

describe('merch item option variants', () => {
  test('fails when disabling variants on item with multiple options', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const params = { uuid: item.uuid };
    const editMerchItemRequest = { merchandise: { hasVariantsEnabled: false } };
    await expect(ControllerFactory.merchStore(conn).editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch items with variants disabled cannot have multiple options');
  });

  test('fails when enabling variants on item where only option has null metadata', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    const editMerchItemRequest = { merchandise: { hasVariantsEnabled: true } };
    await expect(merchStoreController.editMerchItem(params, editMerchItemRequest, admin))
      .rejects.toThrow('Merch options for items with variants enabled must have valid metadata');
  });
});

describe('merch item options', () => {
  test('can add options with some type to an item with variants enabled and options of the same type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    // create and add option with same type as existing options
    const optionWithSameType = MerchFactory.fakeOptionWithType(item.options[0].metadata.type);
    const createMerchOptionRequest = { option: optionWithSameType };
    await merchStoreController.createMerchItemOption(params, createMerchOptionRequest, admin);

    const merchItemResponse = await merchStoreController.getOneMerchItem(params, admin);

    // verify that option was added
    const existingPublicOptions = item.options.map((o) => o.getPublicMerchItemOption(true));
    const allOptions = [
      ...existingPublicOptions,
      optionWithSameType.getPublicMerchItemOption(true),
    ];
    expect(merchItemResponse.item.options).toEqual(expect.arrayContaining(allOptions));
  });

  test('cannot add options with some type to an item with variants enabled but options of another type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: true });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const optionWithDifferentType = MerchFactory.fakeOptionWithType(faker.datatype.hexaDecimal(10));

    const params = { uuid: item.uuid };
    const createMerchOptionRequest = { option: optionWithDifferentType };
    await expect(ControllerFactory.merchStore(conn).createMerchItemOption(params, createMerchOptionRequest, admin))
      .rejects.toThrow('Merch items cannot have multiple option types');
  });

  test('can delete option of some type from item with variants disabled and add option of another type', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({
      hasVariantsEnabled: false,
      hidden: true,
    });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const optionParams = { uuid: item.options[0].uuid };
    const itemParams = { uuid: item.uuid };

    // delete original option from item
    await merchStoreController.deleteMerchItemOption(optionParams, admin);

    // add option of another type
    const optionWithDifferentType = MerchFactory.fakeOptionWithType(faker.datatype.hexaDecimal(10));
    const createMerchOptionRequest = { option: optionWithDifferentType };
    await merchStoreController.createMerchItemOption(itemParams, createMerchOptionRequest, admin);

    const merchItemResponse = await merchStoreController.getOneMerchItem(itemParams, admin);
    expect(merchItemResponse.item.options).toHaveLength(1);
    expect(merchItemResponse.item.options[0])
      .toStrictEqual(optionWithDifferentType.getPublicMerchItemOption(true));
  });

  test('cannot add option to an item with variants disabled and an option', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({ hasVariantsEnabled: false });

    await new PortalState()
      .createUsers(admin)
      .createMerchItem(item)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const params = { uuid: item.uuid };

    const createMerchOptionRequest = { option: MerchFactory.fakeOption() };
    await expect(merchStoreController.createMerchItemOption(params, createMerchOptionRequest, admin))
      .rejects.toThrow('Merch items with variants disabled cannot have multiple options');

    const getMerchItemResponse = await merchStoreController.getOneMerchItem(params, admin);
    expect(getMerchItemResponse.item.options).toHaveLength(1);
    expect(getMerchItemResponse.item.options[0])
      .toStrictEqual(item.options[0].getPublicMerchItemOption(true));
  });
});

describe('merch order pickup events', () => {
  test('GET /order/pickup/future returns pickup events that haven\'t ended yet', async () => {
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

  test('POST /order/pickup persists pickup event on proper input', async () => {
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

  test('POST /order/pickup fails when pickup event start date is later than end date', async () => {
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

  test('PATCH /order/pickup/:uuid properly updates pickup event with valid edits', async () => {
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

  test('PATCH /order/pickup/:uuid fails when pickup event edit\'s start date is later than end date', async () => {
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

  test('placing an order with a pickup event that has reached the order limit fails', async () => {
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

    const merchStoreController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: pickupEvent.uuid,
    };

    for (let i = 1; i < pickupEvent.orderLimit; i += 1) {
      await merchStoreController.placeMerchOrder(placeMerchOrderRequest, member);
    }

    await expect(merchStoreController.placeMerchOrder(placeMerchOrderRequest, member))
      .rejects
      .toThrow('Cannot place order with a fully-booked pickup event');
  });

  test('PATCH /order/pickup/:uuid fails if the order limit is decreased below the number of orders', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake();
    const option = MerchFactory.fakeOption();
    const pickupEvent = MerchFactory.fakeOrderPickupEvent({
      orderLimit: 3,
    });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchItemOption(option)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [{ option, quantity: 1 }], pickupEvent)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const placeMerchOrderRequest = {
      order: [{ option: option.uuid, quantity: 1 }],
      pickupEvent: pickupEvent.uuid,
    };

    for (let i = 1; i < pickupEvent.orderLimit; i += 1) {
      await merchStoreController.placeMerchOrder(placeMerchOrderRequest, member);
    }

    const editPickupEventRequest = {
      pickupEvent: {
        orderLimit: 2,
      },
    };
    const params = { uuid: pickupEvent.uuid };
    await expect(ControllerFactory.merchStore(conn).editPickupEvent(params, editPickupEventRequest, admin))
      .rejects
      .toThrow('Pickup event cannot have order limit lower than the number of orders booked in it');
  });
});
