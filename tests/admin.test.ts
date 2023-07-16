import { access } from 'fs';
import { ActivityScope, ActivityType, SubmitAttendanceForUsersRequest, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { ForbiddenError } from 'routing-controllers';


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
    const users = UserFactory.create(5);


    users[0].accessType = UserAccessType.STAFF;
    users[1].accessType = UserAccessType.STANDARD;
    users[2].accessType = UserAccessType.MARKETING;
    users[3].accessType = UserAccessType.MERCH_STORE_DISTRIBUTOR;

    await new PortalState()
      .createUsers(users[0], users[1], users[2], users[3], admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    const accessLevelResponse = await adminController.updateUserAccessLevel({
      "accessUpdates": [
        { "user": users[0].email,  "newAccess": {
            "accessType": "MERCH_STORE_MANAGER"
        }},
        { "user": users[1].email,  "newAccess": {
            "accessType": "MARKETING"
        }},
        { "user": users[2].email,  "newAccess": {
            "accessType": "MERCH_STORE_DISTRIBUTOR"
        }},
        { "user": users[3].email,  "newAccess": {
            "accessType": "STAFF"
        }}
      ]
    }, admin);

    // expect statements
    expect(accessLevelResponse.updatedUsers[0].email).toEqual(users[0].email);
    expect(accessLevelResponse.updatedUsers[0].accessType).toEqual(UserAccessType.MERCH_STORE_MANAGER);

    expect(accessLevelResponse.updatedUsers[1].email).toEqual(users[1].email);
    expect(accessLevelResponse.updatedUsers[1].accessType).toEqual(UserAccessType.MARKETING);

    expect(accessLevelResponse.updatedUsers[2].email).toEqual(users[2].email);
    expect(accessLevelResponse.updatedUsers[2].accessType).toEqual(UserAccessType.MERCH_STORE_DISTRIBUTOR);

    expect(accessLevelResponse.updatedUsers[3].email).toEqual(users[3].email);
    expect(accessLevelResponse.updatedUsers[3].accessType).toEqual(UserAccessType.STAFF);
  });



  // attempt to update when user is not an admin
  test('attempt to update when user is not an admin', async () => {
    const conn = await DatabaseConnection.get();
    const standard = UserFactory.fake({ accessType: UserAccessType.STANDARD });
    const users = UserFactory.create(5);


    users[0].accessType = UserAccessType.STAFF;
    users[1].accessType = UserAccessType.STANDARD;
    users[2].accessType = UserAccessType.MARKETING;
    users[3].accessType = UserAccessType.MERCH_STORE_DISTRIBUTOR;

    await new PortalState()
      .createUsers(users[0], users[1], users[2], users[3], standard)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await expect(async () => {
      await adminController.updateUserAccessLevel({
        "accessUpdates": [
          { "user": users[0].email, "newAccess": { "accessType": "MERCH_STORE_MANAGER" } },
          { "user": users[1].email, "newAccess": { "accessType": "MARKETING" } },
          { "user": users[2].email, "newAccess": { "accessType": "MERCH_STORE_DISTRIBUTOR" } },
          { "user": users[3].email, "newAccess": { "accessType": "STAFF" } }
        ]
      }, standard);
    }).rejects.toThrow(ForbiddenError);
  });

  test('attempt to update duplicate users', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const users = UserFactory.create(5);


    users[0].accessType = UserAccessType.STAFF;
    users[0].email = "smhariha@ucsd.edu";
    users[1].accessType = UserAccessType.STAFF;
    users[1].email = "smhariha@ucsd.edu";

    await new PortalState()
      .createUsers(users[0], users[1], admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    const accessLevelResponse = await adminController.updateUserAccessLevel({
      "accessUpdates": [
        { "user": users[0].email,  "newAccess": {
            "accessType": "MERCH_STORE_MANAGER"
        }},
        { "user": users[1].email,  "newAccess": {
            "accessType": "MERCH_STORE_MANAGER"
        }}
      ]
    }, admin);

    // expect statements
    //expect(accessLevelResponse.updatedUsers).toHaveLength(1);
    expect(accessLevelResponse.updatedUsers[0].email).toEqual(users[0].email);
    expect(accessLevelResponse.updatedUsers[0].accessType).toEqual(UserAccessType.MERCH_STORE_MANAGER);
  });


  // attempt to promote a user to an admin
  test('attempt to promote a user to an admin', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const users = UserFactory.create(5);

    users[0].accessType = UserAccessType.STAFF;
    users[1].accessType = UserAccessType.STANDARD;
    users[2].accessType = UserAccessType.MARKETING;
    users[3].accessType = UserAccessType.MERCH_STORE_DISTRIBUTOR;

    await new PortalState()
      .createUsers(users[0], users[1], users[2], users[3], admin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await expect(async () => {
      await adminController.updateUserAccessLevel({
        "accessUpdates": [
          { "user": users[0].email, "newAccess": { "accessType": "MERCH_STORE_MANAGER" } },
          { "user": users[1].email, "newAccess": { "accessType": "ADMIN" } },
          { "user": users[2].email, "newAccess": { "accessType": "MERCH_STORE_DISTRIBUTOR" } },
          { "user": users[3].email, "newAccess": { "accessType": "STAFF" } }
        ]
      }, admin);
    }).rejects.toThrow(ForbiddenError);
  });




  // attempt to demote an existing admin
  test('attempt to demote an existing admin', async () => {

    //FIXME: do this for an admin
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    // create another admin user
    const secondAdmin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    secondAdmin.email = "smhariha@ucsd.edu";
    console.log(secondAdmin.accessType);

    await new PortalState()
      .createUsers(admin, secondAdmin)
      .write();

    const adminController = ControllerFactory.admin(conn);

    await expect(async () => {
      await adminController.updateUserAccessLevel({
        "accessUpdates": [
          { "user": "smhariha@ucsd.edu", "newAccess": { "accessType": "MERCH_STORE_MANAGER" } }
        ]
      }, admin);
    }).rejects.toThrow(ForbiddenError);
  });
});

