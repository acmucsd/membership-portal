import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
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

    const event = EventFactory.fake({
      start: moment().subtract(2, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
    });

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

    const event = EventFactory.fake({
      start: moment().subtract(2, 'hour').toDate(),
      end: moment().subtract(1, 'hour').toDate(),
    });

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

    const event = EventFactory.fake({
      start: moment().subtract(1, 'hour').toDate(),
      end: moment().subtract(2, 'hour').toDate(),
    });

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // verifying correct error thrown
    const eventController = ControllerFactory.event(conn);
    await expect(eventController.createEvent(createEventRequest, admin))
      .rejects.toThrow('Start date after end date');
  });

  test('test non-conflicting event creation with re-used past attendance code', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const user = UserFactory.fake();

    await new PortalState()
      .createUsers(admin, user)
      .write();

    const event = EventFactory.fake({
      start: new Date('2050-08-20T10:00:00.000Z'),
      end: new Date('2050-08-20T12:00:00.000Z'),
    });

    const createEventRequest: CreateEventRequest = {
      event,
    };

    const eventController = ControllerFactory.event(conn);
    const eventResponse = await eventController.createEvent(createEventRequest, admin);

    expect(eventResponse.event.cover).toEqual(event.cover);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.location).toEqual(event.location);
    expect(eventResponse.event.committee).toEqual(event.committee);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.start).toEqual(event.start);
    expect(eventResponse.event.end).toEqual(event.end);
    expect(eventResponse.event.pointValue).toEqual(event.pointValue);

    const lookupEvent = await eventController.getOneEvent({ uuid: eventResponse.event.uuid }, user);
    expect(lookupEvent.error).toEqual(null);
    expect(JSON.stringify(lookupEvent.event)).toEqual(JSON.stringify(eventResponse.event));
  });

  test('test conflicting event creation with re-used attendance code', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const user = UserFactory.fake();

    await new PortalState()
      .createUsers(admin, user)
      .write();

    let event = EventFactory.fake({
      start: new Date('2050-08-20T10:00:00.000Z'),
      end: new Date('2050-08-20T12:00:00.000Z'),
      attendanceCode: 'repeated',
    });

    const createEventRequest: CreateEventRequest = {
      event,
    };

    const eventController = ControllerFactory.event(conn);
    await eventController.createEvent(createEventRequest, admin);

    event = EventFactory.fake({
      start: new Date('2050-08-20T09:00:00.000Z'),
      end: new Date('2050-08-20T10:30:00.000Z'),
      attendanceCode: 'repeated',
    });

    const createEventRequest2: CreateEventRequest = {
      event,
    };

    await expect(eventController.createEvent(createEventRequest2, admin))
      .rejects.toThrow('There is a conflicting event with the same attendance code');
  });
});

test('test conflicting event creation with re-used attendance code - 3 days after', async () => {
  const conn = await DatabaseConnection.get();
  const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
  const user = UserFactory.fake();

  await new PortalState()
    .createUsers(admin, user)
    .write();

  let event = EventFactory.fake({
    start: new Date('2050-08-20T10:00:00.000Z'),
    end: new Date('2050-08-20T12:00:00.000Z'),
    attendanceCode: 'repeated',
  });

  const createEventRequest: CreateEventRequest = {
    event,
  };

  const eventController = ControllerFactory.event(conn);
  await eventController.createEvent(createEventRequest, admin);

  event = EventFactory.fake({
    start: new Date('2050-08-20T09:00:00.000Z'),
    end: new Date('2050-08-22T10:30:00.000Z'),
    attendanceCode: 'repeated',
  });

  const createEventRequest2: CreateEventRequest = {
    event,
  };

  await expect(eventController.createEvent(createEventRequest2, admin))
    .rejects.toThrow('There is a conflicting event with the same attendance code');
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
    const repositoryEvent = await repository.find({ uuid: event.uuid });

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
    const repositoryEvent = await repository.findOne({ uuid: event.uuid });

    expect(repositoryEvent).toEqual(event);
  });
});
