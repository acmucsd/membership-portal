import faker = require('faker');
import { SocialMediaType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { UserSocialMediaFactory } from './data/UserSocialMediaFactory';

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

describe('social media URL submission', () => {
  test('properly persists on successful submission', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const userController = ControllerFactory.user(conn);

    await userController.insertSocialMediaForUser({ socialMedia: userSocialMedia }, member);
    const userResponse = await userController.getUser({ uuid: member.uuid }, member);

    expect(userResponse.user.userSocialMedia).toHaveLength(1);
    expect(userResponse.user.userSocialMedia[0]).toEqual({
      ...userSocialMedia,
      uuid: userResponse.user.userSocialMedia[0].uuid,
    });
  });

  test('is invalidated when submitting social media URL of the same type', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member)
      .write();

    const userController = ControllerFactory.user(conn);

    await userController.insertSocialMediaForUser({ socialMedia: userSocialMedia }, member);

    const userSocialMediaWithSameType = UserSocialMediaFactory.fake({ type: SocialMediaType.FACEBOOK });
    const errorMessage = 'Social media URL of this type has already been created for this user';

    await expect(userController.insertSocialMediaForUser({ socialMedia: userSocialMediaWithSameType }, member))
      .rejects.toThrow(errorMessage);
  });
});

describe('social media URL update', () => {
  test('is invalidated when updating social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();
    const unauthorizedMember = UserFactory.fake();
    await new PortalState()
      .createUsers(unauthorizedMember)
      .write();

    const userController = ControllerFactory.user(conn);
    await userController.insertSocialMediaForUser({ socialMedia: userSocialMedia }, member);
    const userResponse = await userController.getUser({ uuid: member.uuid }, member);

    const errorMessage = 'User cannot update a social media URL of another user';

    await expect(userController.updateSocialMediaForUser(
      { uuid: userResponse.user.userSocialMedia[0].uuid },
      { socialMedia: { url: faker.internet.url() } },
      unauthorizedMember,
    )).rejects.toThrow(errorMessage);
  });
});

describe('social media URL delete', () => {
  test('is invalidated when deleting social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();
    const unauthorizedMember = UserFactory.fake();
    await new PortalState()
      .createUsers(unauthorizedMember)
      .write();

    const userController = ControllerFactory.user(conn);
    await userController.insertSocialMediaForUser({ socialMedia: userSocialMedia }, member);
    const userResponse = await userController.getUser({ uuid: member.uuid }, member);

    const errorMessage = 'User cannot delete a social media URL of another user';

    await expect(userController.deleteSocialMediaForUser(
      { uuid: userResponse.user.userSocialMedia[0].uuid },
      unauthorizedMember,
    )).rejects.toThrow(errorMessage);
  });
});
