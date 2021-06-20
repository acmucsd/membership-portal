import { UserErrors } from '../error';
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

describe('merch item edit', () => {
  test('succeeds on base fields update', async () => {
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

    await ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      { merchandise: merchItemEdits },
      admin,
    );

    const merchItemResponse = await ControllerFactory.merchStore(conn).getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item).toStrictEqual({
      collection: merchItemResponse.item.collection,
      ...item.getPublicMerchItem(),
      ...merchItemEdits,
    });
  });
  test('succeeds when basic option fields are updated', async () => {
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

    option1.price -= 1000;
    option1.quantity -= 5;
    option1.discountPercentage = 15;
    option2.price += 500;
    option2.quantity += 5;
    option1.discountPercentage = 0;

    await ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      {
        merchandise: {
          options: [option1, option2],
        },
      },
      admin,
    );

    const merchItemResponse = await ControllerFactory.merchStore(conn).getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining([option1.getPublicMerchItemOption(), option2.getPublicMerchItemOption()]),
    );
  });
  test('succeeds when updated item option metadata types are changed but are still consistent', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata1, metadata2, metadata3] = MerchFactory.createOptionMetadata(3);
    const options = MerchFactory.optionsWith(
      { metadata: metadata1 },
      { metadata: metadata2 },
      { metadata: metadata3 },
    );
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
    options.forEach((option) => { option.metadata.type = 'new type'; });

    await ControllerFactory.merchStore(conn).editMerchItem(
      { uuid: item.uuid },
      { merchandise: { options } },
      admin,
    );

    const merchItemResponse = await ControllerFactory.merchStore(conn).getOneMerchItem({ uuid: item.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining(options.map((option) => option.getPublicMerchItemOption())),
    );
  });

  test('fails when variants are updated to disabled but multiple options still remain', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata1, metadata2, metadata3] = MerchFactory.createOptionMetadata(3);
    const options = MerchFactory.optionsWith(
      { metadata: metadata1 },
      { metadata: metadata2 },
      { metadata: metadata3 },
    );
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
    )).rejects.toThrow(UserErrors.VARIANTS_DISABLED_MULTIPLE_OPTIONS);
  });

  test('fails when updated options have multiple types', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata1, metadata2, metadata3] = MerchFactory.createOptionMetadata(3);
    const options = MerchFactory.optionsWith(
      { metadata: metadata1 },
      { metadata: metadata2 },
      { metadata: metadata3 },
    );
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
    )).rejects.toThrow(UserErrors.MULTIPLE_MERCH_OPTION_TYPES);
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

    await ControllerFactory
      .merchStore(conn)
      .createMerchItemOption({ uuid: merchItem.uuid }, { option: newOption }, admin);

    const merchItemResponse = await ControllerFactory
      .merchStore(conn)
      .getOneMerchItem({ uuid: merchItem.uuid }, admin);

    expect(merchItemResponse.item.options).toEqual(
      expect.arrayContaining([option.getPublicMerchItemOption(), newOption.getPublicMerchItemOption()]),
    );
  });

  test('cannot be added to an item with variants disabled', async () => {
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
    ).rejects.toThrow(UserErrors.VARIANTS_DISABLED_ADD_OPTION);
  });

  test('cannot add different metadata types to an item', async () => {
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
    ).rejects.toThrow(UserErrors.MULTIPLE_MERCH_OPTION_TYPES);
  });
});
