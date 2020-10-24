import { ActivityType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { AttendanceModel } from '../models/AttendanceModel';
import { EventModel } from '../models/EventModel';
import { UserModel } from '../models/UserModel';
import { DatabaseConnection, UserFactory, EventFactory, PortalState } from './data';

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

describe('sample test', () => {
  test('database is empty', async () => {
    const conn = await DatabaseConnection.get();

    const users = await conn.manager.find(UserModel);
    expect(users).toHaveLength(0);

    const events = await conn.manager.find(EventModel);
    expect(events).toHaveLength(0);
  });

  test('data is persisted', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const [event] = EventFactory.with({ attendanceCode: 'attend-me' });
    const state = new PortalState()
      .createUsers([user1])
      .createEvents([event])
      .attendEvents([user1], [event], false)
      .createUsers([user2]);
    await state.write(conn);

    const persistedUser = await conn.manager.findOne(UserModel, user2.uuid);
    expect(persistedUser).toStrictEqual(user2);

    const persistedEvent = await conn.manager.findOne(EventModel, { attendanceCode: 'attend-me' });
    expect(persistedEvent).toStrictEqual(event);

    const [attendance] = await conn.manager.find(AttendanceModel, { relations: ['user', 'event'] });
    expect(attendance.user).toStrictEqual(user1);
    expect(attendance.event).toStrictEqual(event);

    const activities = await conn.manager.find(ActivityModel);
    expect(activities).toHaveLength(3);
    const activityTypes = activities.map((a) => a.type);
    expect(activityTypes).toStrictEqual([
      ActivityType.ACCOUNT_CREATE,
      ActivityType.ATTEND_EVENT,
      ActivityType.ACCOUNT_CREATE,
    ]);
  });
});
