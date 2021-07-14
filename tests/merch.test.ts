import { ForbiddenError } from 'routing-controllers';
import { UserAccessType } from '../types';
import { DatabaseConnection, MerchFactory, UserFactory, PortalState } from './data';
import { ControllerFactory } from './controllers';

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

describe('collection editing', () => {
  test('Appropriate Permission Check for Getting Archived Items', async () => {
    const conn = await DatabaseConnection.get();
    const itemOption = MerchFactory.fakeOption();
    const [item] = MerchFactory.itemsWith({
      options: [itemOption],
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

    const merchStore = ControllerFactory.merchStore(conn);

    const editCollection = {
      collection: {
        title: collection.title,
        description: collection.description,
        archived: true,
      },
    };

    await merchStore.editMerchCollection({ uuid: collection.uuid }, editCollection, admin);

    await expect(merchStore.getOneMerchCollection({ uuid: collection.uuid }, user)).rejects.toThrow(ForbiddenError);

    const result = await merchStore.getOneMerchCollection({ uuid: collection.uuid }, admin);
    expect(result.collection.uuid).toEqual(collection.uuid);
  });

  test('Ordering Archived Items is not allowed', async () => {
    const conn = await DatabaseConnection.get();
    const itemOption = MerchFactory.fakeOption();
    const [item] = MerchFactory.itemsWith({
      options: [itemOption],
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

    const merchStore = ControllerFactory.merchStore(conn);

    const editCollection = {
      collection: {
        title: collection.title,
        description: collection.description,
        archived: true,
      },
    };

    await merchStore.editMerchCollection({ uuid: collection.uuid }, editCollection, admin);

    await expect(merchStore.placeMerchOrder({
      order: [
        { option: itemOption.uuid, quantity: 1 },
      ],
    }, user)).rejects.toThrow(`Not allowed to order: ${[itemOption.uuid]}`);

    await expect(merchStore.placeMerchOrder({
      order: [
        { option: itemOption.uuid, quantity: 1 },
      ],
    }, admin)).rejects.toThrow(`Not allowed to order: ${[itemOption.uuid]}`);
  });
});
