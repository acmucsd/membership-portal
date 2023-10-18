import { ActivityScope, ActivityType, CreateEventRequest, SubmitAttendanceForUsersRequest,
  UserAccessType } from '../types';
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

describe('event creation', () => {
  test('attendance code from past event should pass isUnusedAttendanceCode', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const user = UserFactory.fake();

    await new PortalState()
      .createUsers(admin, user)
      .write();

    let event = {
      cover: 'https://www.google.com',
      title: 'ACM Party @ RIMAC',
      description: 'Indoor Pool Party',
      location: 'RIMAC',
      committee: 'ACM',
      start: new Date('2020-08-20T10:00:00.000Z'),
      end: new Date('2020-08-20T12:00:00.000Z'),
      attendanceCode: 'PastEvent',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    const eventController = ControllerFactory.event(conn);
    await eventController.createEvent(createEventRequest, admin);

    event = {
      cover: 'https://www.google.com',
      title: 'ACM Party @ RIMAC',
      description: 'Indoor Pool Party',
      location: 'RIMAC',
      committee: 'ACM',
      start: new Date('2025-08-20T10:00:00.000Z'),
      end: new Date('2025-08-20T12:00:00.000Z'),
      attendanceCode: 'PastEvent',
      pointValue: 10,
    };

    const createEventRequest2: CreateEventRequest = {
      event,
    };

    await eventController.createEvent(createEventRequest2, admin);
    const eventResponse = await eventController.createEvent(createEventRequest, admin);

    expect(eventResponse.event.cover).toEqual(event.cover);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.location).toEqual(event.location);
    expect(eventResponse.event.committee).toEqual(event.committee);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.pointValue).toEqual(event.pointValue);
  });
});
