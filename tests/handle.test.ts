import { instance } from 'ts-mockito';
import { PatchUserRequest, UserPatches } from 'api/validators/UserControllerRequests';
import { BadRequestError } from 'routing-controllers';
import { validate } from 'class-validator';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import Mocks from './mocks/MockFactory';

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

describe('set user handle', () => {
  test('user can set their handle', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState()
      .createUsers(member)
      .write();

    const customHandle = 'supersecrethandle';
    const fileLocation = 'fake location';
    const storageService = Mocks.storage(fileLocation);
    const userController = ControllerFactory.user(conn, instance(storageService));

    const userPatches: UserPatches = {
      handle: customHandle,
    };

    const patchRequest: PatchUserRequest = {
      user: userPatches,
    };

    const response = await userController.patchCurrentUser(patchRequest, member);

    expect(response.user.handle).toBe(customHandle);
  });

  test('user must have unique handle', async () => {
    const conn = await DatabaseConnection.get();
    const handle = 'handle';
    const member1 = UserFactory.fake({ handle });
    const member2 = UserFactory.fake();
    await new PortalState()
      .createUsers(member1, member2)
      .write();

    const fileLocation = 'fake location';
    const storageService = Mocks.storage(fileLocation);
    const userController = ControllerFactory.user(conn, instance(storageService));

    const userPatches: UserPatches = {
      handle,
    };

    const patchRequest: PatchUserRequest = {
      user: userPatches,
    };

    await expect(userController.patchCurrentUser(patchRequest, member2)).rejects.toThrowError(BadRequestError);
    const { user } = await userController.getCurrentUser(member2);
    expect(user.handle).toBe(null);
  });

  test('get user by handle', async () => {
    const conn = await DatabaseConnection.get();
    const handle = 'handle';
    const member = UserFactory.fake({ handle });
    await new PortalState()
      .createUsers(member)
      .write();

    const fileLocation = 'fake location';
    const storageService = Mocks.storage(fileLocation);
    const userController = ControllerFactory.user(conn, instance(storageService));

    const foundUser = await userController.getUserByHandle({ handle }, member);
    expect(foundUser.user.uuid).toBe(member.uuid);
  });

  test('non-alphanumeric handles are not allowed', async () => {
    const handle = 'qwe!@#$%rty';

    const errors = await validate(plainToClass(Feedback, feedback));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('description');
    expect(errors[0].constraints.minLength).toBeDefined();
  });
});
