import { ActivityScope, ActivityType, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, UserFactory, PortalState } from './data';

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
    const users = UserFactory.create(3);
    const emails = users.map((user) => user.email);
    const [proxyUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([...users, proxyUser])
      .createEvents([event])
      .write();

    const adminController = await ControllerFactory.admin();
    const userController = await ControllerFactory.user();
    const attendanceController = await ControllerFactory.attendance();

    await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, proxyUser);

    await Promise.all(users.map(async (user) => {
      const userResponse = await userController.getUser(user.uuid, proxyUser);

      expect(userResponse.user.points).toEqual(user.points + event.pointValue);

      const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
      expect(attendanceResponse.attendances).toHaveLength(1);
      expect(attendanceResponse.attendances[0].event).toStrictEqual(event.getPublicEvent());

      const activityResponse = await userController.getUserActivityStream(user.uuid, proxyUser);

      expect(activityResponse.activity).toHaveLength(2);
      expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
      expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
      expect(activityResponse.activity[1].scope).toEqual(ActivityScope.PUBLIC);
    }));
  });

  test('does not log activity, attendance, and points for users who already attended', async () => {
    const [user] = UserFactory.create(1);
    const [proxyUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([user, proxyUser])
      .createEvents([event])
      .attendEvents([user], [event])
      .write();

    const adminController = await ControllerFactory.admin();
    const userController = await ControllerFactory.user();
    const attendanceController = await ControllerFactory.attendance();

    await adminController.submitAttendanceForUsers(
      { users: [user.email], event: event.uuid },
      proxyUser,
    );

    const userResponse = await userController.getUser(user.uuid, proxyUser);
    const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
    const activityResponse = await userController.getCurrentUserActivityStream(user);

    expect(userResponse.user.points).toEqual(user.points);
    expect(attendanceResponse.attendances).toHaveLength(1);
    expect(activityResponse.activity).toHaveLength(2);
    expect(activityResponse.activity[1].description).toBeNull();
  });
});
