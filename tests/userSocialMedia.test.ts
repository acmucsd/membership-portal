import faker = require('faker');
import { UserModel } from '../models/UserModel';
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
    let member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member)
      .write();

    const userController = ControllerFactory.user(conn);
    await userController.insertSocialMediaForUser({ socialMedia: userSocialMedia }, member);
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    expect(member.userSocialMedia).toHaveLength(1);
    expect(member.userSocialMedia[0]).toEqual({
      url: userSocialMedia.url,
      type: userSocialMedia.type,
      uuid: userSocialMedia.uuid,
    });
  });

  test('is invalidated when submitting social media URL of the same type', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member)
      .createUserSocialMedia(userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);

    const userSocialMediaWithSameType = UserSocialMediaFactory.fake({ type: SocialMediaType.FACEBOOK });
    const errorMessage = 'Social media URL of this type has already been created for this user';
    await expect(userController.insertSocialMediaForUser({ socialMedia: userSocialMediaWithSameType }, member))
      .rejects.toThrow(errorMessage);
  });
});

describe('social media URL update', () => {
  test('is invalidated when updating social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const unauthorizedMember = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member, unauthorizedMember)
      .createUserSocialMedia(userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    const errorMessage = 'User cannot update a social media URL of another user';
    const uuidParams = { uuid: member.userSocialMedia[0].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await expect(userController.updateSocialMediaForUser(uuidParams, socialMediaParams, unauthorizedMember))
      .rejects.toThrow(errorMessage);
  });
});

describe('social media URL delete', () => {
  test('is invalidated when deleting social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const unauthorizedMember = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member, unauthorizedMember)
      .createUserSocialMedia(userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    const errorMessage = 'User cannot delete a social media URL of another user';
    const uuidParams = { uuid: member.userSocialMedia[0].uuid };
    await expect(userController.deleteSocialMediaForUser(uuidParams, unauthorizedMember)).rejects.toThrow(errorMessage);
  });
});
