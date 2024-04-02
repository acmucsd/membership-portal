import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { anything, instance, verify } from 'ts-mockito';
import { MediaType, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { CreateEventRequest } from '../api/validators/EventControllerRequests';
import { EventModel } from '../models/EventModel';
import Mocks from './mocks/MockFactory';
import { FileFactory } from './data/FileFactory';
import { Config } from '../config';

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
  const fileLocation = 'https://s3.amazonaws.com/event-cover.jpg';

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
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // creating the event
    const cover = FileFactory.image(Config.file.MAX_EVENT_COVER_FILE_SIZE / 2);
    const storageService = Mocks.storage(fileLocation);
    const eventController = ControllerFactory.event(conn, instance(storageService));
    const eventResponse = await eventController.createEvent(cover, createEventRequest, admin);

    // verifying response from event creation
    expect(eventResponse.event.cover).toEqual(fileLocation);
    expect(eventResponse.event.title).toEqual(event.title);
    expect(eventResponse.event.location).toEqual(event.location);
    expect(eventResponse.event.committee).toEqual(event.committee);
    expect(eventResponse.event.start).toEqual(event.start);
    expect(eventResponse.event.end).toEqual(event.end);
    expect(eventResponse.event.pointValue).toEqual(event.pointValue);

    verify(storageService.deleteAtUrl(fileLocation)).never();
    verify(
      storageService.upload(
        cover,
        MediaType.EVENT_COVER,
        anything(),
      ),
    ).called();

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
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // verifying correct error
    const cover = FileFactory.image(Config.file.MAX_EVENT_COVER_FILE_SIZE / 2);
    const storageService = Mocks.storage(fileLocation);
    const eventController = ControllerFactory.event(conn, instance(storageService));
    await expect(eventController.createEvent(cover, createEventRequest, user))
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
      pointValue: 10,
    };

    const createEventRequest: CreateEventRequest = {
      event,
    };

    // verifying correct error thrown
    const cover = FileFactory.image(Config.file.MAX_EVENT_COVER_FILE_SIZE / 2);
    const storageService = Mocks.storage(fileLocation);
    const eventController = ControllerFactory.event(conn, instance(storageService));
    await expect(eventController.createEvent(cover, createEventRequest, admin))
      .rejects.toThrow('Start date after end date');
    verify(storageService.deleteAtUrl(fileLocation)).called();
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
