import { ActivityScope, ActivityType, SubmitAttendanceForUsersRequest, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';

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
    const [adminUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([...users, adminUser])
      .createEvents([event])
      .write();

    const userController = ControllerFactory.user(conn);
    const adminController = ControllerFactory.admin(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, adminUser);

    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      const userResponse = await userController.getUser({ uuid: user.uuid }, adminUser);

      expect(userResponse.user.points).toEqual(user.points + event.pointValue);

      const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
      expect(attendanceResponse.attendances).toHaveLength(1);
      expect(attendanceResponse.attendances[0].event).toStrictEqual(event.getPublicEvent());

      const activityResponse = await userController.getUserActivityStream({ uuid: user.uuid }, adminUser);

      expect(activityResponse.activity).toHaveLength(2);
      expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
      expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
      expect(activityResponse.activity[1].scope).toEqual(ActivityScope.PUBLIC);
    }
  });

  test('does not log activity, attendance, and points for users who already attended', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [adminUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([user, adminUser])
      .createEvents([event])
      .attendEvents([user], [event])
      .write();

    const adminController = ControllerFactory.admin(conn);
    const userController = ControllerFactory.user(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    await adminController.submitAttendanceForUsers(
      { users: [user.email], event: event.uuid },
      adminUser,
    );

    const userResponse = await userController.getUser({ uuid: user.uuid }, adminUser);
    const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
    const activityResponse = await userController.getCurrentUserActivityStream(user);

    expect(userResponse.user.points).toEqual(user.points);
    expect(attendanceResponse.attendances).toHaveLength(1);
    expect(activityResponse.activity).toHaveLength(2);
    expect(activityResponse.activity[1].description).toBeNull();
  });

  test('logs proper activity and point rewards for staff attendance', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [staffUser] = UserFactory.with({ accessType: UserAccessType.STAFF });
    const [adminUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.with({ requiresStaff: true, staffPointBonus: 10 });

    await new PortalState()
      .createUsers([user, staffUser, adminUser])
      .createEvents([event])
      .write();

    const adminController = ControllerFactory.admin(conn);
    const userController = ControllerFactory.user(conn);
    const request: SubmitAttendanceForUsersRequest = {
      users: [user.email, staffUser.email],
      event: event.uuid,
      asStaff: true,
    };

    await adminController.submitAttendanceForUsers(request, adminUser);

    const userResponse = await userController.getUser({ uuid: user.uuid }, adminUser);
    const staffUserResponse = await userController.getUser({ uuid: staffUser.uuid }, adminUser);
    const activityResponse = await userController.getCurrentUserActivityStream(user);
    const staffActivityResponse = await userController.getCurrentUserActivityStream(staffUser);

    expect(userResponse.user.points).toEqual(event.pointValue);
    expect(staffUserResponse.user.points).toEqual(event.pointValue + event.staffPointBonus);
    expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    expect(staffActivityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT_AS_STAFF);
  });
});

describe('email retrieval', () => {
  test('gets all the emails of stored users', async () => {
    const conn = await DatabaseConnection.get();
    const users = UserFactory.create(5);
    const emails = users.map((user) => user.email.toLowerCase());
    const [adminUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers([...users, adminUser])
      .write();

    const adminController = ControllerFactory.admin(conn);
    const response = await adminController.getAllEmails(adminUser);
    expect([...emails, adminUser.email]).toEqual(expect.arrayContaining(response.emails));
  });
});

describe('bonus points submission', () => {
  test('updates points and activity to the users in the bonus request', async () => {
    const conn = await DatabaseConnection.get();
    const users = UserFactory.create(5);
    const emails = users.map((user) => user.email.toLowerCase());
    const [adminUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [extraneousUser] = UserFactory.create(1);

    await new PortalState()
      .createUsers([...users, extraneousUser, adminUser])
      .write();

    const bonus = {
      description: 'Test addition of bonus points',
      users: emails,
      points: 200,
    };

    const createBonusResponse = await ControllerFactory.admin(conn).addBonus({ bonus }, adminUser);
    expect(createBonusResponse.emails).toEqual(expect.arrayContaining(emails));

    for (let u = 0; u < users.length; u += 1) {
      const user = users[u];
      const getUserResponse = await ControllerFactory.user(conn).getUser({ uuid: user.uuid }, adminUser);
      expect(getUserResponse.user.points).toEqual(200);
    }

    const getExtraUserResponse = await ControllerFactory.user(conn).getUser({ uuid: extraneousUser.uuid }, adminUser);
    expect(getExtraUserResponse.user.points).toEqual(0);
  });
});
