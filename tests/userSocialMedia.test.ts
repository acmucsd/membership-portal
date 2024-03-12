import faker = require('faker');
import { Connection } from 'typeorm';
import { UserModel } from '../models/UserModel';
import { SocialMediaType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { UserSocialMediaFactory } from './data/UserSocialMediaFactory';
import { UserController } from '../api/controllers/UserController';

beforeAll(async () => {
  await DatabaseConnection.connect();
});

afterAll(async () => {
  await DatabaseConnection.clear();
  await DatabaseConnection.close();
});

describe('social media URL submission', () => {
  beforeEach(async () => {
    await DatabaseConnection.clear();
  });

  test('properly persists on successful submission', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member });

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
      .createUserSocialMedia(member, userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);

    const userSocialMediaWithSameType = UserSocialMediaFactory.fake({ type: SocialMediaType.FACEBOOK });
    const errorMessage = 'Social media URL of this type has already been created for this user';
    await expect(userController.insertSocialMediaForUser({ socialMedia: userSocialMediaWithSameType }, member))
      .rejects.toThrow(errorMessage);
  });
});

describe('social media URL update', () => {
  beforeEach(async () => {
    await DatabaseConnection.clear();
  });

  test('is invalidated when updating social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const unauthorizedMember = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member, unauthorizedMember)
      .createUserSocialMedia(member, userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    const errorMessage = 'User cannot update a social media URL of another user';
    const uuidParams = { uuid: member.userSocialMedia[0].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await expect(userController.updateSocialMediaForUser(uuidParams, socialMediaParams, unauthorizedMember))
      .rejects.toThrow(errorMessage);
  });

  test('is invalidated when the entity for a uuid is not found', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const userController = ControllerFactory.user(conn);

    const errorMessage = 'Social media URL not found';
    const missingEntityUuid = { uuid: faker.datatype.uuid() };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await expect(userController.updateSocialMediaForUser(missingEntityUuid, socialMediaParams, member))
      .rejects.toThrow(errorMessage);
  });
});

describe('social media URL delete', () => {
  beforeEach(async () => {
    await DatabaseConnection.clear();
  });

  test('is invalidated when deleting social media URL of another user', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const unauthorizedMember = UserFactory.fake();
    const userSocialMedia = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });

    await new PortalState()
      .createUsers(member, unauthorizedMember)
      .createUserSocialMedia(member, userSocialMedia)
      .write();

    const userController = ControllerFactory.user(conn);
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    const errorMessage = 'User cannot delete a social media URL of another user';
    const uuidParams = { uuid: member.userSocialMedia[0].uuid };
    await expect(userController.deleteSocialMediaForUser(uuidParams, unauthorizedMember)).rejects.toThrow(errorMessage);
  });
});

describe('social media URL update', () => {
  let conn : Connection;
  let member : UserModel;
  let userController : UserController;

  let flag : boolean = false;
  function waitForFlag(interval = 500, timeout = 5000) {
    let acc = 0; // time accumulation
    return new Promise((resolve, reject) => {
      const i = setInterval(() => {
        acc += interval;
        if (flag) {
          clearInterval(i);
          resolve(flag);
        }
        if (acc > timeout) {
          clearInterval(i);
          reject();
        }
      }, interval);
    });
  }

  // beforeAll does not behave properly when concurrent is being used:
  // https://stackoverflow.com/questions/42633635/how-to-run-concurrent-tests-in-jest-with-multiple-tests-per-request
  beforeAll(async () => {
    await DatabaseConnection.clear();
    conn = await DatabaseConnection.get();
    member = UserFactory.fake();

    const userSocialMedia0 = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.FACEBOOK });
    const userSocialMedia1 = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.GITHUB });
    const userSocialMedia2 = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.DEVPOST });
    const userSocialMedia3 = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.EMAIL });
    const userSocialMedia4 = UserSocialMediaFactory.fake({ user: member, type: SocialMediaType.INSTAGRAM });

    await new PortalState()
      .createUsers(member)
      .createUserSocialMedia(
        member, userSocialMedia0, userSocialMedia1, userSocialMedia2, userSocialMedia3, userSocialMedia4,
      ).write();

    userController = ControllerFactory.user(conn);

    // refreshes member to have the userSocialMedia field
    member = await conn.manager.findOne(UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] });

    flag = true;
  });

  test.concurrent('concurrent updates properly persist on successful submission 0', async () => {
    await waitForFlag();
    const index = 0;
    const uuidParams = { uuid: member.userSocialMedia[index].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await userController.updateSocialMediaForUser(uuidParams, socialMediaParams, member);

    const expectedUserSocialMedia0 = {
      url: socialMediaParams.socialMedia.url,
      type: member.userSocialMedia[index].type,
      uuid: uuidParams.uuid,
    };
    const updatedMember = await conn.manager.findOne(
      UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] },
    );

    expect(updatedMember.userSocialMedia).toHaveLength(5);
    const targetUserSocialMedia = updatedMember.userSocialMedia.find(
      (socialMedia) => socialMedia.uuid === expectedUserSocialMedia0.uuid,
    );
    expect(targetUserSocialMedia.url).toEqual(expectedUserSocialMedia0.url);
    expect(targetUserSocialMedia.type).toEqual(expectedUserSocialMedia0.type);
  });

  test.concurrent('concurrent updates properly persist on successful submission 1', async () => {
    await waitForFlag();
    const index = 1;
    const uuidParams = { uuid: member.userSocialMedia[index].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await userController.updateSocialMediaForUser(uuidParams, socialMediaParams, member);

    const expectedUserSocialMedia1 = {
      url: socialMediaParams.socialMedia.url,
      type: member.userSocialMedia[index].type,
      uuid: uuidParams.uuid,
    };
    const updatedMember = await conn.manager.findOne(
      UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] },
    );

    expect(updatedMember.userSocialMedia).toHaveLength(5);
    const targetUserSocialMedia = updatedMember.userSocialMedia.find(
      (socialMedia) => socialMedia.uuid === expectedUserSocialMedia1.uuid,
    );
    expect(targetUserSocialMedia.url).toEqual(expectedUserSocialMedia1.url);
    expect(targetUserSocialMedia.type).toEqual(expectedUserSocialMedia1.type);
  });

  test.concurrent('concurrent updates properly persist on successful submission 2', async () => {
    await waitForFlag();
    const index = 2;
    const uuidParams = { uuid: member.userSocialMedia[index].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await userController.updateSocialMediaForUser(uuidParams, socialMediaParams, member);

    const expectedUserSocialMedia2 = {
      url: socialMediaParams.socialMedia.url,
      type: member.userSocialMedia[index].type,
      uuid: uuidParams.uuid,
    };
    const updatedMember = await conn.manager.findOne(
      UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] },
    );

    expect(updatedMember.userSocialMedia).toHaveLength(5);
    const targetUserSocialMedia = updatedMember.userSocialMedia.find(
      (socialMedia) => socialMedia.uuid === expectedUserSocialMedia2.uuid,
    );
    expect(targetUserSocialMedia.url).toEqual(expectedUserSocialMedia2.url);
    expect(targetUserSocialMedia.type).toEqual(expectedUserSocialMedia2.type);
  });

  test.concurrent('concurrent updates properly persist on successful submission 3', async () => {
    await waitForFlag();
    const index = 3;
    const uuidParams = { uuid: member.userSocialMedia[index].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await userController.updateSocialMediaForUser(uuidParams, socialMediaParams, member);

    const expectedUserSocialMedia3 = {
      url: socialMediaParams.socialMedia.url,
      type: member.userSocialMedia[index].type,
      uuid: uuidParams.uuid,
    };
    const updatedMember = await conn.manager.findOne(
      UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] },
    );

    expect(updatedMember.userSocialMedia).toHaveLength(5);
    const targetUserSocialMedia = updatedMember.userSocialMedia.find(
      (socialMedia) => socialMedia.uuid === expectedUserSocialMedia3.uuid,
    );
    expect(targetUserSocialMedia.url).toEqual(expectedUserSocialMedia3.url);
    expect(targetUserSocialMedia.type).toEqual(expectedUserSocialMedia3.type);
  });

  test.concurrent('concurrent updates properly persist on successful submission 4', async () => {
    await waitForFlag();
    const index = 4;
    const uuidParams = { uuid: member.userSocialMedia[index].uuid };
    const socialMediaParams = { socialMedia: { url: faker.internet.url() } };
    await userController.updateSocialMediaForUser(uuidParams, socialMediaParams, member);

    const expectedUserSocialMedia4 = {
      url: socialMediaParams.socialMedia.url,
      type: member.userSocialMedia[index].type,
      uuid: uuidParams.uuid,
    };
    const updatedMember = await conn.manager.findOne(
      UserModel, { uuid: member.uuid }, { relations: ['userSocialMedia'] },
    );

    expect(updatedMember.userSocialMedia).toHaveLength(5);
    const targetUserSocialMedia = updatedMember.userSocialMedia.find(
      (socialMedia) => socialMedia.uuid === expectedUserSocialMedia4.uuid,
    );
    expect(targetUserSocialMedia.url).toEqual(expectedUserSocialMedia4.url);
    expect(targetUserSocialMedia.type).toEqual(expectedUserSocialMedia4.type);
  });
});
