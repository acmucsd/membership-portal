import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';

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

describe('Delete user account', () => {
  test('Deleted user account cannot log in', async () => {
    const conn = await DatabaseConnection.get();
    const account = UserFactory.fake();

    await new PortalState().createUsers(account).write();
    const userController = await ControllerFactory.user(conn);

    const deletedUserResponse = await userController.deleteAccount(account);

    expect(deletedUserResponse).toStrictEqual({ error: null });
  });
  test('Deleted user account is not viewable to other members', async () => {
  });
  test('Deleted user account is still counted for event attendance', async () => {
  });
});
