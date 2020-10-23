import * as moment from 'moment';
import { EventModel } from '../models/EventModel';
import { UserModel } from '../models/UserModel';
import { UserAccessType, UserState } from '../types';
import DatabaseConnection from './DatabaseConnection';
import { AttendEvents, CreateEvents, CreateUsers, EventFactory, PortalState, UserFactory } from './data';

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

test('sample test', async () => {
  const [user] = UserFactory.create(1);
  const [event] = EventFactory.with({ attendanceCode: 'attend-me' });
  const conn = await DatabaseConnection.get();
  await conn.manager.save(user);
  await conn.manager.save(event);
  // const state = PortalState.of([
  //   CreateUsers.of(user),
  //   CreateEvents.of(event),
  //   AttendEvents.user(user, false, event),
  // ]);
  expect(await conn.manager.findOne(UserModel, user.uuid)).toStrictEqual(user);
  expect(await conn.manager.findOne(EventModel, { attendanceCode: 'attend-me' })).toStrictEqual(event);
});
