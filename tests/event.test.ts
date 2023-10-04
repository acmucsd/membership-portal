import { ForbiddenError } from 'routing-controllers';
import { UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { CreateEventRequest } from '../api/validators/EventControllerRequests';

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

    //setting up inputs
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
      start: new Date('2020-08-20T10:00:00.000Z'),
      end: new Date('2020-08-20T12:00:00.000Z'),
      attendanceCode: 'p4rty',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    //creating the event
    const eventController = ControllerFactory.event(conn);
    const eventResponse = await eventController.createEvent(createEventRequest, admin);

    //verifying response from event creation
    expect(eventResponse.event.cover).toEqual(event.cover);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.location).toEqual(event.location);
    expect(eventResponse.event.committee).toEqual(event.committee);
    expect(eventResponse.event.start).toEqual(event.start);
    expect(eventResponse.event.end).toEqual(event.end);
    expect(eventResponse.event.pointValue).toEqual(event.pointValue);

    //verifying response from event lookup
    const lookupEventResponse = await eventController.getOneEvent({ uuid: eventResponse.event.uuid }, user);
    expect(lookupEventResponse.error).toEqual(null);
    expect(lookupEventResponse.event).toStrictEqual(eventResponse.event);
  });

  test('check for permissions', async () => {
    //setting up inputs
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
      start: new Date('2020-08-20T14:00:00.000Z'),
      end: new Date('2020-08-20T12:00:00.000Z'),
      attendanceCode: 'p4rty',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    //verifying correct error
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.createEvent(createEventRequest, user))
      .rejects.toThrow(ForbiddenError);
  });

  test('throws error when start date later than end date', async () => {
    //setting up inputs
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
      start: new Date('2020-08-20T14:00:00.000Z'),
      end: new Date('2020-08-20T12:00:00.000Z'),
      attendanceCode: 'p4rty',
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    //verifying correct error thrown
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.createEvent(createEventRequest, admin))
      .rejects.toThrow('Start date after end date');
  });
});
