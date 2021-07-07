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
  test('Set collection to archive', async () => {
    const conn = await DatabaseConnection.get();
    const itemOpt = MerchFactory.fakeOption();
    const [item] = MerchFactory.itemsWith({
      options: [itemOpt],
    });
    const [collection] = MerchFactory.collectionsWith({
      items: [item],
      archived: false,
    });
    item.collection = collection;
    itemOpt.item = item;

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

    const error = `Not allowed to order: ${[itemOpt.uuid]}`;

    await expect(merchStore.getOneMerchCollection({ uuid: collection.uuid }, user)).rejects.toThrow(ForbiddenError);

    await expect(merchStore.placeMerchOrder({
      order: [
        { option: itemOpt.uuid, quantity: 1 },
      ],
    }, user)).rejects.toThrow(error);
  });
});
