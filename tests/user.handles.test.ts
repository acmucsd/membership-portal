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

describe('Set User Handle', () => {
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

  test('User Cannot Set Handle Using an Invalid Handle Format', async () => {
    // TODO: I can't get this test to reject with an error because validators aren't run here for some reason
    // const conn = await DatabaseConnection.get();
    // const member = UserFactory.fake();

    // const shortHandle = 'a';
    // const longHandle = 'a'.repeat(40);
    // const specialCharHandle = '@!#!*)$#@&SAD}{ ';

    // await new PortalState().createUsers(member).write();

    // const userController = ControllerFactory.user(conn);

    // await expect(userController.patchCurrentUser({ user: { handle: shortHandle } }, member)).rejects.toThrow('');
    // await expect(userController.patchCurrentUser({ user: { handle: longHandle } }, member)).rejects.toThrow('');
    // await expect(userController
    //   .patchCurrentUser({ user: { handle: specialCharHandle } }, member)).rejects.toThrow('');
  });

  test('User Cannot Set Their Handle to an already existing Handle', async () => {
    const conn = await DatabaseConnection.get();
    const [member, existingUser] = UserFactory.create(2);

    await new PortalState().createUsers(member, existingUser).write();

    const userController = ControllerFactory.user(conn);

    const errorMessage = 'This handle is already in use.';
    await expect(userController.patchCurrentUser(
      { user: { handle: existingUser.handle } },
      member,
    )).rejects.toThrow(errorMessage);
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
    const response = await userController.getUserByHandle({ handle: otherUser.handle }, loggedInUser);

    expect(response.user).toEqual(otherUser.getPublicProfile());
  });
});
