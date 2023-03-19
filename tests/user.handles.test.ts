import 'reflect-metadata'; // this shim is required
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import * as faker from 'faker';
import { UserPatches } from '../api/validators/UserControllerRequests';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';

// Required to pass class-validator validation on user patch even for optional fields
const passwordChange = {
  password: 'mypassword',
  newPassword: 'mypassword',
  confirmPassword: 'mypassword',
};

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

describe('Update User Handle', () => {
  test('Logged-in user can update their own handle', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState().createUsers(member).write();

    const userController = ControllerFactory.user(conn);
    const handle = 'mycustomhandle';
    const patchedUserResponse = await userController.patchCurrentUser({ user: { handle } }, member);

    expect(patchedUserResponse.error).toBeNull();
    const patchedUser = patchedUserResponse.user;
    expect(patchedUser).toEqual({ ...member.getFullUserProfile(), handle });
  });

  test('User Cannot Update Their Handle to an already existing Handle', async () => {
    const conn = await DatabaseConnection.get();
    const [member, existingUser] = UserFactory.create(2);

    await new PortalState().createUsers(member, existingUser).write();

    const userController = ControllerFactory.user(conn);

    const errorMessage = 'This handle is already in use.';
    await expect(
      userController.patchCurrentUser({ user: { handle: existingUser.handle } }, member),
    ).rejects.toThrow(errorMessage);
  });
});

describe('Get User Handles', () => {
  test('User Can View Their Own Handle While Editing Profile', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState().createUsers(member).write();

    const userController = ControllerFactory.user(conn);
    const userResponse = await userController.getCurrentUser(member);

    expect(userResponse.error).toBeNull();
    const { user } = userResponse;
    expect(user.handle).toBe(member.handle);
  });

  test("Logged In User Can Fetch Another User's Profile by Handle", async () => {
    const conn = await DatabaseConnection.get();
    const [loggedInUser, otherUser] = UserFactory.create(2);

    await new PortalState().createUsers(loggedInUser, otherUser).write();

    const userController = ControllerFactory.user(conn);
    const response = await userController.getUserByHandle(
      { handle: otherUser.handle },
      loggedInUser,
    );

    expect(response.user).toEqual(otherUser.getPublicProfile());
  });
});

describe('Update to Invalid User Handle', () => {
  test('Update handle error: too short', async () => {
    const MIN_LENGTH = 3;
    const user = UserFactory.fake({ handle: 'a' });

    const errors = await validate(plainToClass(UserPatches, { ...user,
      passwordChange }));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('handle');
    expect(errors[0].constraints).toBeDefined();
    expect(Object.keys(errors[0].constraints)).toHaveLength(1);
    expect(errors[0].constraints.length).toBeDefined();
    expect(errors[0].constraints.length)
      .toBe(`handle must be longer than or equal to ${MIN_LENGTH} characters`);
  });

  test('Update handle error: too long', async () => {
    const MAX_LEN = 32;
    const user = UserFactory.fake({ handle: faker.datatype.hexaDecimal(2 * MAX_LEN).toLowerCase() });

    const errors = await validate(plainToClass(UserPatches, { ...user,
      passwordChange }));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('handle');
    expect(errors[0].constraints).toBeDefined();
    expect(Object.keys(errors[0].constraints)).toHaveLength(1);
    expect(errors[0].constraints.length).toBeDefined();
    expect(errors[0].constraints.length)
      .toBe(`handle must be shorter than or equal to ${MAX_LEN} characters`);
  });

  test('Update handle error: invalid characters', async () => {
    const user = UserFactory.fake({ handle: 'abc!' });

    const errors = await validate(plainToClass(UserPatches, { ...user,
      passwordChange }));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('handle');
    expect(errors[0].constraints).toBeDefined();
    expect(Object.keys(errors[0].constraints)).toHaveLength(1);
    expect(errors[0].constraints.HandleValidator).toBeDefined();
    expect(errors[0].constraints.HandleValidator)
      .toBe('Your handle can only contain dashes and lowercase alphanumeric characters.');
  });

  test('Update handle error: too short and invalid characters', async () => {
    const MIN_LENGTH = 3;
    const user = UserFactory.fake({ handle: 'a!' });

    const errors = await validate(plainToClass(UserPatches, { ...user,
      passwordChange }));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('handle');
    expect(errors[0].constraints).toBeDefined();
    expect(Object.keys(errors[0].constraints)).toHaveLength(2);
    expect(errors[0].constraints.length).toBeDefined();
    expect(errors[0].constraints.length)
      .toBe(`handle must be longer than or equal to ${MIN_LENGTH} characters`);
    expect(errors[0].constraints.HandleValidator).toBeDefined();
    expect(errors[0].constraints.HandleValidator)
      .toBe('Your handle can only contain dashes and lowercase alphanumeric characters.');
  });
});
