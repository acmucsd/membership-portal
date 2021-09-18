import { ForbiddenError } from 'routing-controllers';
import { MerchItemEdit, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, MerchFactory, UserFactory, PortalState } from './data';
import { MerchandiseItemOptionModel } from '../models/MerchandiseItemOptionModel';

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

describe('archived merch collections', () => {
  test('only admins can view archived collections', async () => {
    const conn = await DatabaseConnection.get();
    const option = MerchFactory.fakeOption();
    const [item] = MerchFactory.itemsWith({
      options: [option],
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
      archived: false,
    });
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [user] = UserFactory.with({ accessType: UserAccessType.STANDARD });

    await new PortalState()
      .createUsers([admin, user])
      .createMerch([collection])
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);

    const collectionEdit = {
      collection: {
        archived: true,
      },
    };

    await merchStoreController.editMerchCollection({ uuid: collection.uuid }, collectionEdit, admin);

    await expect(merchStoreController.getOneMerchCollection({ uuid: collection.uuid }, user))
      .rejects
      .toThrow(ForbiddenError);

    const result = await merchStoreController.getOneMerchCollection({ uuid: collection.uuid }, admin);
    expect(result.collection.uuid).toEqual(collection.uuid);
  });

  test('ordering items from archived collections is not allowed', async () => {
    const conn = await DatabaseConnection.get();
    const [option] = MerchFactory.optionsWith({ price: 5000 });
    const [item] = MerchFactory.itemsWith({
      options: [option],
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
      archived: false,
    });
    const orderPickupEvent = MerchFactory.fakeOrderPickupEvent();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [user] = UserFactory.with({
      accessType: UserAccessType.STANDARD,
      credits: 5000,
    });

    await new PortalState()
      .createUsers([admin, user])
      .createMerch([collection])
      .createOrderPickupEvents([orderPickupEvent])
      .write();

    const collectionEdit = {
      collection: {
        archived: true,
      },
    };

    const merchStoreController = ControllerFactory.merchStore(conn);

    await merchStoreController.editMerchCollection({ uuid: collection.uuid }, collectionEdit, admin);

    await expect(merchStoreController.placeMerchOrder(
      {
        order: [
          { option: option.uuid, quantity: 1 },
        ],
        pickupEvent: orderPickupEvent.uuid,
      },
      user,
    )).rejects.toThrow(`Not allowed to order: ${[option.uuid]}`);
  });
});

describe('merch items', () => {
  test('can have 0 item options if the item is hidden', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      hidden: true,
      hasVariantsEnabled: false,
      options: [option],
    });
    const collection = MerchFactory.fakeCollection({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.deleteMerchItemOption({ uuid: option.uuid }, admin);
    let updatedItemResponse = await merchStoreController.getOneMerchItem({ uuid: item.uuid }, admin);

    expect(updatedItemResponse.item.options).toHaveLength(0);

    // Check that adding an option to an item with 0 options behaves properly
    await merchStoreController.createMerchItemOption({ uuid: item.uuid }, { option }, admin);
    updatedItemResponse = await merchStoreController.getOneMerchItem({ uuid: item.uuid }, admin);

    expect(updatedItemResponse.item.options).toHaveLength(1);
  });

  test('cannot have 0 item options if the item is not hidden', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const option = MerchFactory.fakeOption();
    const item = MerchFactory.fakeItem({
      hidden: false,
      hasVariantsEnabled: false,
      options: [option],
    });
    const collection = MerchFactory.fakeCollection({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    expect(ControllerFactory.merchStore(conn).deleteMerchItemOption({ uuid: option.uuid }, admin))
      .rejects
      .toThrow('Cannot delete the only option for a visible merch item');
  });
});

describe('merch item edits', () => {
  test('succeeds when item fields are edited', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [item] = MerchFactory.itemsWith({
      itemName: 'ACM Sticker - Light Theme',
      description: 'Light-themed swag for any laptop. Comes in only 1 size',
      monthlyLimit: 5,
      lifetimeLimit: 10,
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    const merchItemEdits: MerchItemEdit = {
      description: 'Now selling more per customer',
      monthlyLimit: 10,
      lifetimeLimit: 20,
    };
    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.editMerchItem({ uuid: item.uuid }, { merchandise: merchItemEdits }, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item).toStrictEqual({
      collection: merchItemResponse.item.collection,
      ...item.getPublicMerchItem(true),
      ...merchItemEdits,
    });
  });

  test('succeeds when item option fields are updated', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [option1, option2] = MerchFactory.optionsWith(
      {
        price: 2500,
        quantity: 10,
        discountPercentage: 0,
        metadata: {
          type: 'SIZE',
          value: '12 in.',
          position: 0,
        },
      }, {
        price: 3500,
        quantity: 5,
        discountPercentage: 10,
        metadata: {
          type: 'SIZE',
          value: '24 in.',
          position: 1,
        },
      },
    );
    const [item] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options: [option1, option2],
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    const option1Update = {
      uuid: option1.uuid,
      price: 2000,
      quantityToAdd: 5,
      discountPercentage: 10,
    };
    const option2Update = {
      uuid: option2.uuid,
      price: 1000,
      quantityToAdd: 10,
      discountPercentage: 20,
    };

    const merchStoreController = ControllerFactory.merchStore(conn);

    await merchStoreController.editMerchItem(
      {
        uuid: item.uuid,
      },
      {
        merchandise: {
          options: [option1Update, option2Update],
        },
      },
      admin,
    );

    const merchItemResponse = await merchStoreController.getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining([
        {
          uuid: option1.uuid,
          quantity: option1.quantity + option1Update.quantityToAdd,
          price: option1Update.price,
          discountPercentage: option1Update.discountPercentage,
          metadata: option1.metadata,
        },
        {
          uuid: option2.uuid,
          quantity: option2.quantity + option2Update.quantityToAdd,
          price: option2Update.price,
          discountPercentage: option2Update.discountPercentage,
          metadata: option2.metadata,
        },
      ]),
    );
  });

  test('succeeds when item option metadata types are updated', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    let options = MerchFactory.createOptions(3);
    const [item] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options,
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    // change every option's type to a different but consistent one
    options = options.map((option) => MerchandiseItemOptionModel.merge(option, { metadata: { type: 'new type ' } }));

    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.editMerchItem({ uuid: item.uuid }, { merchandise: { options } }, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining(options.map((option) => option.getPublicMerchItemOption(true))),
    );
  });

  test('fails when variants are updated to disabled but multiple options still remain', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const options = MerchFactory.createOptions(3);
    const [item] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options,
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    await expect(ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      { merchandise: { hasVariantsEnabled: false } },
      admin,
    )).rejects.toThrow('Merch items with variants disabled cannot have multiple options');
  });

  test('fails when updated options have multiple types', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const options = MerchFactory.createOptions(3);
    const [item] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options,
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    // change only one option's type to a different one
    options[0].metadata.type = 'new type';

    await expect(ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      { merchandise: { options } },
      admin,
    )).rejects.toThrow('Merch items cannot have multiple option types');
  });

  test('fails when the item is updated to be visible but the item has 0 options', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const item = MerchFactory.fakeItem({
      hidden: true,
      hasVariantsEnabled: true,
      options: [],
    });
    const collection = MerchFactory.fakeCollection({
      items: [item],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([collection])
      .write();

    await expect(ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      { merchandise: { hidden: false } },
      admin,
    ))
      .rejects
      .toThrow('Item cannot be set to visible if it has 0 options.');
  });
});

describe('merch item options', () => {
  test('can be added to an item with variants enabled and with same option type', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata, newMetadata] = MerchFactory.createOptionMetadata(2);
    const [option, newOption] = MerchFactory.optionsWith({ metadata }, { metadata: newMetadata });
    const [merchItem] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options: [option],
    });
    const [merchCollection] = MerchFactory.collectionsWith({
      items: [merchItem],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([merchCollection])
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.createMerchItemOption({ uuid: merchItem.uuid }, { option: newOption }, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem({ uuid: merchItem.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining([option.getPublicMerchItemOption(true), newOption.getPublicMerchItemOption(true)]),
    );
  });

  test('cannot be added to an item with variants enabled if it has a different option type', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata] = MerchFactory.optionMetadataWith({ type: 'COLOR' });
    const [differentMetadata] = MerchFactory.optionMetadataWith({ type: 'SIZE' });
    const [option, newOption] = MerchFactory.optionsWith({ metadata }, { metadata: differentMetadata });
    const [merchItem] = MerchFactory.itemsWith({
      hasVariantsEnabled: true,
      options: [option],
    });
    const [merchCollection] = MerchFactory.collectionsWith({
      items: [merchItem],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([merchCollection])
      .write();

    await expect(
      ControllerFactory.merchStore(conn).createMerchItemOption(
        { uuid: merchItem.uuid },
        { option: newOption },
        admin,
      ),
    ).rejects.toThrow('Merch item cannot have multiple option types');
  });

  test('can be added to an item with variants disabled if it has 0 options', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata, newMetadata] = MerchFactory.createOptionMetadata(2);
    const [option, newOption] = MerchFactory.optionsWith({ metadata }, { metadata: newMetadata });
    const [merchItem] = MerchFactory.itemsWith({
      hasVariantsEnabled: false,
      options: [option],
    });
    const [merchCollection] = MerchFactory.collectionsWith({
      items: [merchItem],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([merchCollection])
      .write();

    const merchStoreController = ControllerFactory.merchStore(conn);
    await merchStoreController.deleteMerchItemOption({ uuid: option.uuid }, admin);
    await merchStoreController.createMerchItemOption({ uuid: merchItem.uuid }, { option: newOption }, admin);
    const merchItemResponse = await merchStoreController.getOneMerchItem({ uuid: merchItem.uuid }, admin);

    expect(merchItemResponse.item.options).toHaveLength(1);
    expect(merchItemResponse.item.options[0]).toStrictEqual(newOption.getPublicMerchItemOption(true));
  });

  test('cannot be added to an item with variants disabled if it has at least 1 option', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata, newMetadata] = MerchFactory.createOptionMetadata(2);
    const [option, newOption] = MerchFactory.optionsWith({ metadata }, { metadata: newMetadata });
    const [merchItem] = MerchFactory.itemsWith({
      hasVariantsEnabled: false,
      options: [option],
    });
    const [merchCollection] = MerchFactory.collectionsWith({
      items: [merchItem],
    });

    await new PortalState()
      .createUsers([admin])
      .createMerch([merchCollection])
      .write();

    await expect(
      ControllerFactory.merchStore(conn).createMerchItemOption(
        { uuid: merchItem.uuid },
        { option: newOption },
        admin,
      ),
    ).rejects.toThrow('Cannot add more than 1 option to items with variants disabled');
  });
});
