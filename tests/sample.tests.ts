import { createConnection } from 'typeorm';
import * as moment from 'moment';
import { EventModel } from '../models/EventModel';
import { UserModel } from '../models/UserModel';
import { models as entities } from '../models';

test('sample test', () => {
  expect(true).toBeTruthy();
});

test('in-memory sqlite', async () => {
  const conn = await createConnection({
    type: 'sqlite',
    database: ':memory:',
    entities,
    dropSchema: true,
    synchronize: true,
    logging: true,
  });
  const user = UserModel.create({
    email: 'email',
    firstName: 'first',
    lastName: 'last',
    hash: 'hash',
    graduationYear: 2020,
    major: 'major',
  });
  const event = EventModel.create({
    title: 'title',
    description: 'description',
    location: 'location',
    start: new Date(moment().subtract(5, 'hours').valueOf()),
    end: new Date(),
    attendanceCode: 'attendanceCode',
    pointValue: 5,
  });
  conn.manager.save(user);
  conn.manager.save(event);
  conn.close();
});
