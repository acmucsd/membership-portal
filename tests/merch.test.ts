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
  test('can be added to an item with variants enabled', async () => {
    const conn = await DatabaseConnection.get();
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const metadata = MerchFactory.optionMetadataWith(
      { type: 'COLOR' },
      { type: 'COLOR' },
      { type: 'COLOR' },
    );
    const [option1, option2, newOption] = MerchFactory.optionsWith(
      { metadata: metadata[0] },
      { metadata: metadata[1] },
      { metadata: metadata[2] },
    );
    const [merchItem] = MerchFactory.itemsWith({
      hasVariants: true,
      options: [option1, option2],
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
    const [singletonOption, newOption] = MerchFactory.optionsWith({ metadata: MerchFactory.fakeOptionMetadata() });
    const [merchItem] = MerchFactory.itemsWith({
      hasVariants: false,
      options: [singletonOption],
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
});
