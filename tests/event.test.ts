import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { CreateEventRequest } from '../api/validators/EventControllerRequests';
import { EventModel } from '../models/EventModel';

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

describe('event creation', () => {
  test('successful event creation', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const user = UserFactory.fake();

    await new PortalState()
      .createUsers(admin, user)
      .write();

    const event = {
      cover: 'https://www.google.com',
      title: 'ACM Party @ RIMAC',
      description: 'Indoor Pool Party',
      location: 'RIMAC',
      committee: 'ACM',
      start: moment().subtract(2, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
      attendanceCode: 'p4rty',
      foodItems: 'Boba',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // creating the event
    const eventController = ControllerFactory.event(conn);
    const eventResponse = await eventController.createEvent(createEventRequest, admin);

    // verifying response from event creation
    expect(eventResponse.event.cover).toEqual(event.cover);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.location).toEqual(event.location);
    expect(eventResponse.event.committee).toEqual(event.committee);
    expect(eventResponse.event.start).toEqual(event.start);
    expect(eventResponse.event.end).toEqual(event.end);
    expect(eventResponse.event.foodItems).toEqual(event.foodItems);
    expect(eventResponse.event.pointValue).toEqual(event.pointValue);

    // verifying response from event lookup
    const lookupEventResponse = await eventController.getOneEvent({ uuid: eventResponse.event.uuid }, user);
    expect(lookupEventResponse.error).toEqual(null);
    expect(lookupEventResponse.event).toStrictEqual(eventResponse.event);
  });

  test('check for permissions', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const user = UserFactory.fake();

    await new PortalState()
      .createUsers(user)
      .write();

    const event = {
      cover: 'https://www.google.com',
      title: 'ACM Party @ RIMAC',
      description: 'Indoor Pool Party',
      location: 'RIMAC',
      committee: 'ACM',
      start: moment().subtract(2, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
      attendanceCode: 'p4rty',
      foodItems: '',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // verifying correct error
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.createEvent(createEventRequest, user))
      .rejects.toThrow(ForbiddenError);
  });

  test('throws error when start date later than end date', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers(admin)
      .write();

    const event = {
      cover: 'https://www.google.com',
      title: 'ACM Party @ RIMAC',
      description: 'Indoor Pool Party',
      location: 'RIMAC',
      committee: 'ACM',
      start: moment().subtract(1, 'hour').toDate(),
      end: moment().subtract(2, 'hour').toDate(),
      attendanceCode: 'p4rty',
      foodItems: null,
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // verifying correct error thrown
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.createEvent(createEventRequest, admin))
      .rejects.toThrow('Start date after end date');
  });
});

describe('event deletion', () => {
  test('should delete event that has no attendances', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const event = EventFactory.fake();

    await new PortalState()
      .createUsers(admin)
      .createEvents(event)
      .write();

    // deleting the event
    const eventController = ControllerFactory.event(conn);
    await eventController.deleteEvent({ uuid: event.uuid }, admin);

    // verifying event deleted
    const repository = conn.getRepository(EventModel);
    const repositoryEvent = await repository.find({ where: { uuid: event.uuid } });

    expect(repositoryEvent).toHaveLength(0);
  });

  test('should not delete event that has attendances', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const user = UserFactory.fake();
    const event = EventFactory.fake();

    await new PortalState()
      .createUsers(admin, user)
      .createEvents(event)
      .attendEvents([user], [event])
      .write();

    // verifying correct error thrown
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.deleteEvent({ uuid: event.uuid }, admin))
      .rejects.toThrow('Cannot delete event that has attendances');

    // verifying event not deleted
    const repository = conn.getRepository(EventModel);
    const repositoryEvent = await repository.findOne({ where: { uuid: event.uuid } });

    expect(repositoryEvent).toEqual(event);
  });
});
