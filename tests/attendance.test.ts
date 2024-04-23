import * as faker from 'faker';
import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { ControllerFactory } from '@tests/controllers';
import { ActivityType, UserAccessType } from '@customtypes';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from '@tests/data';

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

describe('attendance', () => {
  test('only admins can see attendances for event', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const staff = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const member = UserFactory.fake();
    const event = EventFactory.fake({ requiresStaff: true });

    await new PortalState()
      .createUsers(admin, staff, member)
      .createEvents(event)
      .attendEvents([staff, member], [event], true)
      .write();

    const attendanceController = ControllerFactory.attendance(conn);
    const params = { uuid: event.uuid };

    // throws permissions error for member
    await expect(attendanceController.getAttendancesForEvent(params, member))
      .rejects.toThrow(ForbiddenError);

    // returns all attendances for admin
    const getAttendancesForEventResponse = await attendanceController.getAttendancesForEvent(params, admin);
    const attendancesForEvent = getAttendancesForEventResponse.attendances.map((a) => ({
      user: a.user.uuid,
      event: a.event.uuid,
      asStaff: a.asStaff,
    }));
    const expectedAttendances = [
      { event: event.uuid, user: staff.uuid, asStaff: true },
      { event: event.uuid, user: member.uuid, asStaff: false },
    ];
    expect(attendancesForEvent).toEqual(expect.arrayContaining(expectedAttendances));
  });

  test('members can attend events for points and credits', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.ongoing());

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    // attend event
    const attendanceController = ControllerFactory.attendance(conn);
    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await attendanceController.attendEvent(attendEventRequest, member);

    // check user points and credits
    const userController = ControllerFactory.user(conn);
    const getUserResponse = await userController.getCurrentUser(member);
    expect(getUserResponse.user.points).toEqual(event.pointValue);
    expect(getUserResponse.user.credits).toEqual(event.pointValue * 100);

    // check user activities
    const getUserActivitiesResponse = await userController.getCurrentUserActivityStream(member);
    const attendanceActivity = getUserActivitiesResponse.activity[getUserActivitiesResponse.activity.length - 1];
    expect(attendanceActivity.type).toEqual(ActivityType.ATTEND_EVENT);
    expect(attendanceActivity.pointsEarned).toEqual(event.pointValue);

    // check attendances for user
    const getAttendancesForUserResponse = await attendanceController.getAttendancesForCurrentUser(member);
    const attendance = getAttendancesForUserResponse.attendances[0];
    expect(attendance.user.uuid).toEqual(member.uuid);
    expect(attendance.event.uuid).toEqual(event.uuid);
  });

  test('members can attend events 30 minutes before the event starts at the earliest', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake({
      start: moment().add(20, 'minutes').toDate(),
      end: moment().add(2, 'hours').add(20, 'minutes').toDate(),
    });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    // attend event
    const attendanceController = ControllerFactory.attendance(conn);
    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await attendanceController.attendEvent(attendEventRequest, member);

    // check attendances for user
    const getAttendancesForUserResponse = await attendanceController.getAttendancesForCurrentUser(member);
    const attendance = getAttendancesForUserResponse.attendances[0];
    expect(attendance.user.uuid).toEqual(member.uuid);
    expect(attendance.event.uuid).toEqual(event.uuid);
  });

  test('members can attend events up to 30 minutes after the event ends', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake({
      start: moment().subtract(2, 'hours').subtract(20, 'minutes').toDate(),
      end: moment().subtract(20, 'minutes').toDate(),
    });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    // attend event
    const attendanceController = ControllerFactory.attendance(conn);
    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await attendanceController.attendEvent(attendEventRequest, member);

    // check attendances for user
    const getAttendancesForUserResponse = await attendanceController.getAttendancesForCurrentUser(member);
    const attendance = getAttendancesForUserResponse.attendances[0];
    expect(attendance.user.uuid).toEqual(member.uuid);
    expect(attendance.event.uuid).toEqual(event.uuid);
  });

  test('throws if invalid attendance code', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.ongoing());

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    const attendEventRequest = { attendanceCode: faker.datatype.hexaDecimal(10) };
    await expect(ControllerFactory.attendance(conn).attendEvent(attendEventRequest, member))
      .rejects.toThrow('Oh no! That code didn\'t work.');
  });

  test('throws if attendance code entered more than 30 minutes before event', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.daysAfter(1));

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await expect(ControllerFactory.attendance(conn).attendEvent(attendEventRequest, member))
      .rejects.toThrow('This event hasn\'t started yet, please wait to check in.');
  });

  test('throws if attendance code entered more than 30 minutes after event', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.daysBefore(1));

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await expect(ControllerFactory.attendance(conn).attendEvent(attendEventRequest, member))
      .rejects.toThrow('This event has ended and is no longer accepting attendances');
  });

  test('throws if member has already attended event', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.ongoing());

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .attendEvents([member], [event])
      .write();

    const attendEventRequest = { attendanceCode: event.attendanceCode };
    await expect(ControllerFactory.attendance(conn).attendEvent(attendEventRequest, member))
      .rejects.toThrow('You have already attended this event');
  });

  test('members without staff role do not receive staff bonuses', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const event = EventFactory.fake({
      ...EventFactory.ongoing(),
      requiresStaff: true,
    });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    // attend event
    const attendanceController = ControllerFactory.attendance(conn);
    const attendEventRequest = {
      attendanceCode: event.attendanceCode,
      asStaff: true,
    };
    await attendanceController.attendEvent(attendEventRequest, member);

    // check user points and credits
    const userController = ControllerFactory.user(conn);
    const getUserResponse = await userController.getCurrentUser(member);
    expect(getUserResponse.user.points).toEqual(event.pointValue);
    expect(getUserResponse.user.credits).toEqual(event.pointValue * 100);

    // check user activities
    const getUserActivitiesResponse = await userController.getCurrentUserActivityStream(member);
    const attendanceActivity = getUserActivitiesResponse.activity[getUserActivitiesResponse.activity.length - 1];
    expect(attendanceActivity.type).toEqual(ActivityType.ATTEND_EVENT);
    expect(attendanceActivity.pointsEarned).toEqual(event.pointValue);
  });

  test('staff can attend events for extra points and credits', async () => {
    const conn = await DatabaseConnection.get();
    const staff = UserFactory.fake({ accessType: UserAccessType.STAFF });
    const event = EventFactory.fake({
      ...EventFactory.ongoing(),
      requiresStaff: true,
    });

    await new PortalState()
      .createUsers(staff)
      .createEvents(event)
      .write();

    // attend event as staff
    const attendanceController = ControllerFactory.attendance(conn);
    const attendEventRequest = {
      attendanceCode: event.attendanceCode,
      asStaff: true,
    };
    await attendanceController.attendEvent(attendEventRequest, staff);

    // check user points and credits
    const userController = ControllerFactory.user(conn);
    const pointsEarned = event.pointValue + event.staffPointBonus;
    const getUserResponse = await userController.getCurrentUser(staff);
    expect(getUserResponse.user.points).toEqual(pointsEarned);
    expect(getUserResponse.user.credits).toEqual(pointsEarned * 100);

    // check user activities
    const getUserActivitiesResponse = await userController.getCurrentUserActivityStream(staff);
    const attendanceActivity = getUserActivitiesResponse.activity[getUserActivitiesResponse.activity.length - 1];
    expect(attendanceActivity.type).toEqual(ActivityType.ATTEND_EVENT_AS_STAFF);
    expect(attendanceActivity.pointsEarned).toEqual(pointsEarned);

    // check attendances for user
    const getAttendancesForUserResponse = await attendanceController.getAttendancesForCurrentUser(staff);
    const attendance = getAttendancesForUserResponse.attendances[0];
    expect(attendance.user.uuid).toEqual(staff.uuid);
    expect(attendance.event.uuid).toEqual(event.uuid);
  });

  test('get another user attendance by uuid', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake();
    const member2 = UserFactory.fake();
    const event1 = EventFactory.fake({ requiresStaff: true });
    const event2 = EventFactory.fake({ requiresStaff: true });

    await new PortalState()
      .createUsers(member1, member2)
      .createEvents(event1, event2)
      .attendEvents([member1], [event1, event2])
      .write();

    const attendanceController = ControllerFactory.attendance(conn);
    const params = { uuid: member1.uuid };

    // returns all attendances for uuid
    const getAttendancesForUserUuid = await attendanceController.getAttendancesForUser(params, member2);
    const attendancesForEvent = getAttendancesForUserUuid.attendances.map((a) => ({
      user: a.user.uuid,
      event: a.event.uuid,
      asStaff: a.asStaff,
    }));
    const expectedAttendances = [
      { event: event1.uuid, user: member1.uuid, asStaff: false },
      { event: event2.uuid, user: member1.uuid, asStaff: false },
    ];
    expect(attendancesForEvent).toEqual(expect.arrayContaining(expectedAttendances));
  });

  test('throws error when isAttendancePublic is false', async () => {
    const conn = await DatabaseConnection.get();
    const member1 = UserFactory.fake();
    const member2 = UserFactory.fake();
    const event1 = EventFactory.fake({ requiresStaff: true });
    const event2 = EventFactory.fake({ requiresStaff: true });

    await new PortalState()
      .createUsers(member1, member2)
      .createEvents(event1, event2)
      .attendEvents([member1, member2], [event1, event2])
      .write();

    const attendanceController = ControllerFactory.attendance(conn);
    const userController = ControllerFactory.user(conn);
    const params = { uuid: member1.uuid };

    const changePublicAttendancePatch = { user: { isAttendancePublic: false } };
    await userController.patchCurrentUser(changePublicAttendancePatch, member1);

    await expect(attendanceController.getAttendancesForUser(params, member2))
      .rejects.toThrow(ForbiddenError);
  });
});
