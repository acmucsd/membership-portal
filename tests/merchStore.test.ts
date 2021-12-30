import * as faker from 'faker';
import { ForbiddenError } from 'routing-controllers';
import { zip } from 'underscore';
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
describe('creating merch collections', () => {
  test('getting created collections returns them in reverse order of creation', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const firstCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: faker.date.past(),
      archived: true,
    });
    const secondCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: new Date(),
      archived: false,
    });
    const thirdCollectionToBeMade = MerchFactory.fakeCollection({
      createdAt: faker.date.future(),
      archived: false,
    });

    await new PortalState()
      .createUsers(admin, member)
      .createMerchCollections(firstCollectionToBeMade, secondCollectionToBeMade, thirdCollectionToBeMade)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    const expectedCollectionOrder = [thirdCollectionToBeMade, secondCollectionToBeMade]
      .map((coll) => coll.uuid);

    const collectionsVisibleByAdmin = await merchStoreController.getAllMerchCollections(admin);

    expect(collectionsVisibleByAdmin.collections.map((collection) => collection.uuid))
      .toEqual(expectedCollectionOrder.concat(firstCollectionToBeMade.uuid));

    const collectionsVisibleByMember = await merchStoreController.getAllMerchCollections(member);

    expect(collectionsVisibleByMember.collections.map((collection) => collection.uuid))
      .toEqual(expectedCollectionOrder);
  });
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
});

describe('merch items with options', () => {
  test('monthly and lifetime remaining values are properly set when ordering different item options', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const optionMetadataType = faker.datatype.hexaDecimal(10);
    const option1 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option2 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const option3 = MerchFactory.fakeOptionWithType(optionMetadataType);
    const unorderedOption = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      options: [option1, option2, option3],
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const unorderedItem = MerchFactory.fakeItem({
      options: [unorderedOption],
      hasVariantsEnabled: false,
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const pickupEvent = MerchFactory.fakeFutureOrderPickupEvent();

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .createMerchItem(unorderedItem)
      .createOrderPickupEvents(pickupEvent)
      .orderMerch(member, [
        { option: option1, quantity: 1 },
        { option: option2, quantity: 1 },
        { option: option3, quantity: 1 },
      ], pickupEvent)
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    const orderedItemParams = { uuid: item.uuid };
    const getOrderedItemResponse = await merchStoreController.getOneMerchItem(orderedItemParams, member);
    const updatedItem = getOrderedItemResponse.item;

    // make sure the ordered item's remaining counts got updated
    expect(updatedItem.monthlyRemaining).toEqual(2);
    expect(updatedItem.lifetimeRemaining).toEqual(7);

    const unorderedItemParams = { uuid: unorderedItem.uuid };
    const getUnorderedItemResponse = await merchStoreController.getOneMerchItem(unorderedItemParams, member);
    const unchangedItem = getUnorderedItemResponse.item;

    // make sure the un-ordered item's remaining counts didn't change
    expect(unchangedItem.monthlyRemaining).toEqual(5);
    expect(unchangedItem.lifetimeRemaining).toEqual(10);
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

    const publicUpdatedOptions = updatedOptions.map((o) => o.getPublicMerchItemOption());
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
    const existingPublicOptions = item.options.map((o) => o.getPublicMerchItemOption());
    const allOptions = [
      ...existingPublicOptions,
      optionWithSameType.getPublicMerchItemOption(),
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
      .toStrictEqual(optionWithDifferentType.getPublicMerchItemOption());
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
      .toStrictEqual(item.options[0].getPublicMerchItemOption());
  });
});

describe('checkout cart', () => {
  test('passing in valid item option uuids returns the full options and their items', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option1 = MerchFactory.fakeOption();
    const option2 = MerchFactory.fakeOption();
    const option3 = MerchFactory.fakeOption();
    const options = [option1, option2, option3];

    const itemForOptions1And2 = MerchFactory.fakeItem({ options: [option1, option2] });
    const itemForOption3 = MerchFactory.fakeItem({ options: [option3] });

    // need to explicitly set option.item after calling fakeItem(),
    // so that the item.options elements don't have circular references to
    // the item, but the singular option objects here do
    // (so that option.getPublicCartMerchItemOption() doesn't throw for undefined item)
    option1.item = itemForOptions1And2;
    option2.item = itemForOptions1And2;
    option3.item = itemForOption3;

    await new PortalState()
      .createUsers(member)
      .createMerchItem(itemForOptions1And2)
      .createMerchItem(itemForOption3)
      .write();

    const params = { items: options.map((o) => o.uuid) };
    const merchStoreController = ControllerFactory.merchStore(conn);
    const getCartResponse = await merchStoreController.getCartItems(params, member);

    const { cart } = getCartResponse;

    expect(cart).toHaveLength(3);
    expect(cart[0]).toStrictEqual(option1.getPublicOrderMerchItemOption());
    expect(cart[1]).toStrictEqual(option2.getPublicOrderMerchItemOption());
    expect(cart[2]).toStrictEqual(option3.getPublicOrderMerchItemOption());
  });

  test('passing in item option uuids that do not exist throws an error', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const option1 = MerchFactory.fakeOption();
    const option2 = MerchFactory.fakeOption();
    const options = [option1, option2];

    const item = MerchFactory.fakeItem({ options: [option1, option2] });

    await new PortalState()
      .createUsers(member)
      .createMerchItem(item)
      .write();

    const validOptionUuids = options.map((o) => o.uuid);
    const invalidOptionUuid = faker.datatype.uuid();
    const params = { items: [...validOptionUuids, invalidOptionUuid] };
    const merchStoreController = ControllerFactory.merchStore(conn);
    expect(merchStoreController.getCartItems(params, member))
      .rejects.toThrow(`The following items were not found: ${[invalidOptionUuid]}`);
  });
});
