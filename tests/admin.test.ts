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
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const emails = [user1, user2].map((user) => user.email);
    const [onBehalfOfUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([user1, user2, onBehalfOfUser])
      .createEvents([event])
      .write(conn);

    const adminController = ControllerFactory.admin(conn);
    const userController = ControllerFactory.user(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, onBehalfOfUser);

    const userResponse1 = await userController.getUser(user1.uuid, onBehalfOfUser);
    const userResponse2 = await userController.getUser(user2.uuid, onBehalfOfUser);

    expect(userResponse1.user.points).toEqual(user1.points + event.pointValue);
    expect(userResponse2.user.points).toEqual(user2.points + event.pointValue);

    const attendanceResponse1 = await attendanceController.getAttendancesForCurrentUser(user1);
    const attendanceResponse2 = await attendanceController.getAttendancesForCurrentUser(user2);

    expect(attendanceResponse1.attendances).toHaveLength(1);
    expect(attendanceResponse1.attendances[0].event).toStrictEqual(event.getPublicEvent());
    expect(attendanceResponse2.attendances).toHaveLength(1);
    expect(attendanceResponse2.attendances[0].event).toStrictEqual(event.getPublicEvent());

    const activityResponse1 = await userController.getCurrentUserActivityStream(user1);
    const activityResponse2 = await userController.getCurrentUserActivityStream(user1);

    expect(activityResponse1.activity).toHaveLength(2);
    expect(activityResponse1.activity[1].pointsEarned).toEqual(event.pointValue);
    expect(activityResponse1.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    expect(activityResponse1.activity[1].scope).toEqual(ActivityScope.PUBLIC);

    expect(activityResponse2.activity).toHaveLength(2);
    expect(activityResponse2.activity[1].pointsEarned).toEqual(event.pointValue);
    expect(activityResponse2.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    expect(activityResponse2.activity[1].scope).toEqual(ActivityScope.PUBLIC);
  });

  test('does not log activity, attendance, and points for users who already attended', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [onBehalfOfUser] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [event] = EventFactory.create(1);

    await new PortalState()
      .createUsers([user, onBehalfOfUser])
      .createEvents([event])
      .attendEvents([user], [event])
      .write(conn);

    await ControllerFactory.admin(conn).submitAttendanceForUsers(
      { users: [user.email], event: event.uuid },
      onBehalfOfUser,
    );

    const userResponse = await ControllerFactory.user(conn).getUser(user.uuid, onBehalfOfUser);
    const attendanceResponse = await ControllerFactory.attendance(conn).getAttendancesForCurrentUser(user);
    const activityResponse = await ControllerFactory.user(conn).getCurrentUserActivityStream(user);

    expect(userResponse.user.points).toEqual(user.points);
    expect(attendanceResponse.attendances).toHaveLength(1);
    expect(activityResponse.activity).toHaveLength(2);
    expect(activityResponse.activity[1].description).toBeNull();
  });
});
