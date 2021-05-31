import { UserErrors } from '../error';
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

describe('merch item options', () => {
  test('can be added to an item with variants enabled and with same option type', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata, newMetadata] = MerchFactory.createOptionMetadataOfSameType(2);
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

    const response = await ControllerFactory.merchStore(conn).createMerchItemOption(
      { uuid: merchItem.uuid },
      { option: newOption },
      admin,
    );

    expect(response.error).toBeNull();
    expect(response.option).toStrictEqual(newOption.getPublicMerchItemOption());
  });

  test('cannot be added to an item with variants disabled', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata, newMetadata] = MerchFactory.createOptionMetadataOfSameType(2);
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
    ).rejects.toThrow(UserErrors.NO_ITEM_VARIANTS_ADD_OPTION);
  });

  test('cannot add different metadata types to an item', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [metadata] = MerchFactory.optionMetadataWith({ type: 'COLOR' });
    const [newMetadata] = MerchFactory.optionMetadataWith({ type: 'SIZE' });
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

    await expect(
      ControllerFactory.merchStore(conn).createMerchItemOption(
        { uuid: merchItem.uuid },
        { option: newOption },
        admin,
      ),
    ).rejects.toThrow(UserErrors.MULTIPLE_MERCH_OPTION_TYPES);
  });
});
