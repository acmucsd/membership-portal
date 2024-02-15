import { BadRequestError, ForbiddenError } from 'routing-controllers';
import { In } from 'typeorm';
import { ActivityScope, ActivityType, SubmitAttendanceForUsersRequest, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { UserModel } from '../models/UserModel';

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

describe('retroactive attendance submission', () => {
  test('logs activity, attendance, and points for users who have not attended', async () => {
    const conn = await DatabaseConnection.get();
    const users = UserFactory.create(3);
    const emails = users.map((user) => user.email);
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const event = EventFactory.fake();

    await new PortalState()
      .createUsers(...users, admin)
      .createEvents(event)
      .write();

    const userController = ControllerFactory.user(conn);
    const adminController = ControllerFactory.admin(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, admin);

    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      const userResponse = await userController.getUser({ uuid: user.uuid }, admin);

      expect(userResponse.user.points).toEqual(user.points + event.pointValue);

      const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
      expect(attendanceResponse.attendances).toHaveLength(1);
      expect(attendanceResponse.attendances[0].event).toStrictEqual(event.getPublicEvent());

      const activityResponse = await userController.getUserActivityStream({ uuid: user.uuid }, admin);

      expect(activityResponse.activity).toHaveLength(2);
      expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
      expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
      expect(activityResponse.activity[1].scope).toEqual(ActivityScope.PUBLIC);
    }
  });

  test('does not log activity, attendance, and points for users who already attended', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const event = EventFactory.fake();

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event)
      .attendEvents([member], [event])
      .write();

    const adminController = ControllerFactory.admin(conn);
    const userController = ControllerFactory.user(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    await adminController.submitAttendanceForUsers(
      { users: [member.email], event: event.uuid },
      admin,
    );

    const userResponse = await userController.getUser({ uuid: member.uuid }, admin);
    expect(userResponse.user.points).toEqual(member.points);

    const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(member);
    expect(attendanceResponse.attendances).toHaveLength(1);
    expect(attendanceResponse.attendances[0].event.uuid).toEqual(event.uuid);
    expect(attendanceResponse.attendances[0].asStaff).toEqual(false);

    const activityResponse = await userController.getCurrentUserActivityStream(member);
    expect(activityResponse.activity).toHaveLength(2);
    expect(activityResponse.activity[1].description).toBeNull();
    expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
  });

  test('logs proper activity and point rewards for staff attendance', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const staff = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const event = EventFactory.fake({
      requiresStaff: true,
      staffPointBonus: 10,
    });

    await new PortalState()
      .createUsers(member, staff, admin)
      .createEvents(event)
      .write();

    const adminController = ControllerFactory.admin(conn);
    const userController = ControllerFactory.user(conn);
    const request: SubmitAttendanceForUsersRequest = {
      users: [member.email, staff.email],
      event: event.uuid,
      asStaff: true,
    };

    await adminController.submitAttendanceForUsers(request, admin);

    const userResponse = await userController.getUser({ uuid: member.uuid }, admin);
    expect(userResponse.user.points).toEqual(event.pointValue);

    const staffUserResponse = await userController.getUser({ uuid: staff.uuid }, admin);
    expect(staffUserResponse.user.points).toEqual(event.pointValue + event.staffPointBonus);

    const activityResponse = await userController.getCurrentUserActivityStream(member);
    expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);

    const staffActivityResponse = await userController.getCurrentUserActivityStream(staff);
    expect(staffActivityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT_AS_STAFF);
  });
});

describe('email retrieval', () => {
  test('gets all the emails of stored users', async () => {
    const conn = await DatabaseConnection.get();
    const users = UserFactory.create(5);
    const emails = users.map((user) => user.email.toLowerCase());
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers(...users, admin)
      .write();

    const response = await ControllerFactory.admin(conn).getAllEmails(admin);
    expect(expect.arrayContaining(response.emails)).toEqual([...emails, admin.email]);
  });
});

describe('bonus points submission', () => {
  test('updates points and activity to the users in the bonus request', async () => {
    const conn = await DatabaseConnection.get();
    const [userNotGettingBonus, ...users] = UserFactory.create(5);
    const emails = users.map((user) => user.email.toLowerCase());
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers(...users, userNotGettingBonus, admin)
      .write();

    const bonus = {
      description: 'Test addition of bonus points',
      users: emails,
      points: 200,
    };

    const createBonusResponse = await ControllerFactory.admin(conn).addBonus({ bonus }, admin);
    expect(createBonusResponse.emails).toEqual(expect.arrayContaining(emails));

    const userController = ControllerFactory.user(conn);

    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      const getUserResponse = await userController.getUser({ uuid: user.uuid }, admin);
      expect(getUserResponse.user.points).toEqual(200);

      const activityResponse = await userController.getCurrentUserActivityStream(user);
      expect(activityResponse.activity).toHaveLength(2);
      expect(activityResponse.activity[1].description).toEqual(bonus.description);
      expect(activityResponse.activity[1].type).toEqual(ActivityType.BONUS_POINTS);
      expect(activityResponse.activity[1].pointsEarned).toEqual(bonus.points);
    }

    const getNoBonusUserResponse = await userController.getUser({ uuid: userNotGettingBonus.uuid }, admin);
    expect(getNoBonusUserResponse.user.points).toEqual(0);
  });
});

describe('updating user access level', () => {
  test('updates the access level of the user', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    const staffUser = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const standardUser = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const marketingUser = UserFactory.fake({ accessType: UserAccessType.MARKETING });
    const merchStoreDistributorUser = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });

    await new PortalState()
      .createUsers(admin, staffUser, standardUser, marketingUser, merchStoreDistributorUser)
      .write();

    const adminController = ControllerFactory.admin(conn);

    const accessLevelResponse = await adminController.updateUserAccessLevel({
      accessUpdates: [
        { user: staffUser.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
        { user: standardUser.email, accessType: UserAccessType.MARKETING },
        { user: marketingUser.email, accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR },
        { user: merchStoreDistributorUser.email, accessType: UserAccessType.STAFF },
      ],
    }, admin);

    const repository = conn.getRepository(UserModel);
    const updatedUsers = await repository.find({
      email: In([staffUser.email, standardUser.email, marketingUser.email, merchStoreDistributorUser.email]),
    });

    expect(updatedUsers[0].email).toEqual(staffUser.email);
    expect(updatedUsers[0].accessType).toEqual(UserAccessType.MERCH_STORE_MANAGER);
    expect(accessLevelResponse.updatedUsers[0].accessType).toEqual(UserAccessType.MERCH_STORE_MANAGER);

    expect(updatedUsers[1].email).toEqual(standardUser.email);
    expect(updatedUsers[1].accessType).toEqual(UserAccessType.MARKETING);
    expect(accessLevelResponse.updatedUsers[1].accessType).toEqual(UserAccessType.MARKETING);

    expect(updatedUsers[2].email).toEqual(marketingUser.email);
    expect(updatedUsers[2].accessType).toEqual(UserAccessType.MERCH_STORE_DISTRIBUTOR);
    expect(accessLevelResponse.updatedUsers[2].accessType).toEqual(UserAccessType.MERCH_STORE_DISTRIBUTOR);

    expect(updatedUsers[3].email).toEqual(merchStoreDistributorUser.email);
    expect(updatedUsers[3].accessType).toEqual(UserAccessType.STAFF);
    expect(accessLevelResponse.updatedUsers[3].accessType).toEqual(UserAccessType.STAFF);
  });

  test('attempt to update when user is not an admin', async () => {
    const conn = await DatabaseConnection.get();
    const standard = UserFactory.fake({ accessType: UserAccessType.STANDARD });

    const staffUser = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const standardUser = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const marketingUser = UserFactory.fake({ accessType: UserAccessType.MARKETING });
    const merchStoreDistributorUser = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });

    await new PortalState()
      .createUsers(staffUser, standardUser, marketingUser, merchStoreDistributorUser, standard)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await expect(async () => {
      await adminController.updateUserAccessLevel({
        accessUpdates: [
          { user: staffUser.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
          { user: standardUser.email, accessType: UserAccessType.MARKETING },
          { user: marketingUser.email, accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR },
          { user: merchStoreDistributorUser.email, accessType: UserAccessType.STAFF },
        ],
      }, standard);
    }).rejects.toThrow(ForbiddenError);

    const repository = conn.getRepository(UserModel);
    const updatedUsers = await repository.find({
      email: In([staffUser.email, standardUser.email, marketingUser.email, merchStoreDistributorUser.email]),
    });

    expect(updatedUsers[0].email).toEqual(staffUser.email);
    expect(updatedUsers[0].accessType).toEqual(UserAccessType.STAFF);
    expect(updatedUsers[1].email).toEqual(standardUser.email);
    expect(updatedUsers[1].accessType).toEqual(UserAccessType.STANDARD);
    expect(updatedUsers[2].email).toEqual(marketingUser.email);
    expect(updatedUsers[2].accessType).toEqual(UserAccessType.MARKETING);
    expect(updatedUsers[3].email).toEqual(merchStoreDistributorUser.email);
    expect(updatedUsers[3].accessType).toEqual(UserAccessType.MERCH_STORE_DISTRIBUTOR);
  });

  test('attempt to update duplicate users', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    const userOne = UserFactory.fake({ accessType: UserAccessType.STAFF, email: 'smhariha@ucsd.edu' });

    await new PortalState()
      .createUsers(userOne, admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await expect(async () => {
      await adminController.updateUserAccessLevel({
        accessUpdates: [
          { user: userOne.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
          { user: userOne.email, accessType: UserAccessType.STAFF },
        ],
      }, admin);
    }).rejects.toThrow(BadRequestError);

    const repository = conn.getRepository(UserModel);
    const updatedUsers = await repository.findOne({ email: userOne.email });

    expect(updatedUsers.email).toEqual(userOne.email);
    expect(updatedUsers.accessType).toEqual(UserAccessType.STAFF);
  });

  test('ensure that admins cannot demote/promote other admins', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    const secondAdmin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const regularUser = UserFactory.fake({ accessType: UserAccessType.STANDARD });

    await new PortalState()
      .createUsers(admin, secondAdmin, regularUser)
      .write();

    const adminController = ControllerFactory.admin(conn);

    // attempt to demote an admin to merch store manager
    await expect(async () => {
      await adminController.updateUserAccessLevel({
        accessUpdates: [
          { user: secondAdmin.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
        ],
      }, admin);
    }).rejects.toThrow(ForbiddenError);

    const repository = conn.getRepository(UserModel);
    const secondAdminFromDatabase = await repository.findOne({ email: secondAdmin.email });

    expect(secondAdminFromDatabase.email).toEqual(secondAdmin.email);
    expect(secondAdminFromDatabase.accessType).toEqual(UserAccessType.ADMIN);

    // attempt to promote a regular user to admin
    await expect(async () => {
      await adminController.updateUserAccessLevel({
        accessUpdates: [
          { user: regularUser.email, accessType: UserAccessType.ADMIN },
        ],
      }, admin);
    }).rejects.toThrow(ForbiddenError);

    const regularUserFromDatabase = await repository.findOne({ email: regularUser.email });

    expect(regularUserFromDatabase.email).toEqual(regularUser.email);
    expect(regularUserFromDatabase.accessType).toEqual(UserAccessType.STANDARD);
  });

  test("ensure that the updating user's access level is not changed & cannot demote themselves", async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    const staffUser = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const standardUser = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const marketingUser = UserFactory.fake({ accessType: UserAccessType.MARKETING });
    const merchStoreDistributorUser = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });

    await new PortalState()
      .createUsers(staffUser, standardUser, marketingUser, merchStoreDistributorUser, admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await adminController.updateUserAccessLevel({
      accessUpdates: [
        { user: staffUser.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
        { user: standardUser.email, accessType: UserAccessType.MARKETING },
        { user: marketingUser.email, accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR },
        { user: merchStoreDistributorUser.email, accessType: UserAccessType.STAFF },
      ],
    }, admin);

    const repository = conn.getRepository(UserModel);
    const existingAdmin = await repository.find({
      email: admin.email,
    });

    expect(existingAdmin[0].email).toEqual(admin.email);
    expect(existingAdmin[0].accessType).toEqual(UserAccessType.ADMIN);
  });

  test('ensure that a user cannot demote themselves', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    const staffUser = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const standardUser = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const marketingUser = UserFactory.fake({ accessType: UserAccessType.MARKETING });
    const merchStoreDistributorUser = UserFactory.fake({ accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR });

    await new PortalState()
      .createUsers(staffUser, standardUser, marketingUser, merchStoreDistributorUser, admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    // attempt to demote oneself
    await expect(async () => {
      await adminController.updateUserAccessLevel({
        accessUpdates: [
          { user: staffUser.email, accessType: UserAccessType.MERCH_STORE_MANAGER },
          { user: standardUser.email, accessType: UserAccessType.MARKETING },
          { user: marketingUser.email, accessType: UserAccessType.MERCH_STORE_DISTRIBUTOR },
          { user: merchStoreDistributorUser.email, accessType: UserAccessType.STAFF },
          { user: admin.email, accessType: UserAccessType.STANDARD },
        ],
      }, admin);
    }).rejects.toThrow(ForbiddenError);

    const repository = conn.getRepository(UserModel);
    const existingAdmin = await repository.find({
      email: admin.email,
    });

    expect(existingAdmin[0].email).toEqual(admin.email);
    expect(existingAdmin[0].accessType).toEqual(UserAccessType.ADMIN);
  });
});
