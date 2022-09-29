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

describe('resume permissions', () => {
  test('only visible resume is retrievable by only admins', async () => {
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

    // await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, admin);

    // for (let u = 0; u < users.length; u += 1) {
    //   const user = users[u];
    //   const userResponse = await userController.getUser({ uuid: user.uuid }, admin);

    //   expect(userResponse.user.points).toEqual(user.points + event.pointValue);

    //   const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
    //   expect(attendanceResponse.attendances).toHaveLength(1);
    //   expect(attendanceResponse.attendances[0].event).toStrictEqual(event.getPublicEvent());

    //   const activityResponse = await userController.getUserActivityStream({ uuid: user.uuid }, admin);

    //   expect(activityResponse.activity).toHaveLength(2);
    //   expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
    //   expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    //   expect(activityResponse.activity[1].scope).toEqual(ActivityScope.PUBLIC);
    // }
  });

});