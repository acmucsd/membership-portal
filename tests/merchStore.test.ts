import { UserAccessType } from '../types';
import { UserError } from '../utils/Errors';
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
  test('Set collection to archive', async () => {
    const conn = await DatabaseConnection.get();
    const item = MerchFactory.fakeItem();
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

    merchStore.editMerchCollection({ uuid: collection.uuid }, editCollection, admin);

    const resultCollection = await merchStore.getOneMerchCollection({ uuid: collection.uuid }, user);

    expect(resultCollection.error).toBeNull();
    expect(resultCollection.collection).toBeDefined();
    expect(resultCollection.collection.title).toEqual(collection.title);

    expect(await merchStore.placeMerchOrder({
      order: [
        { option: item.uuid, quantity: 1 },
      ],
    }, user)).toThrowError(UserError);
  });
});
