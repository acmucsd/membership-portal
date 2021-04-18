import * as moment from 'moment';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { ControllerFactory } from './controllers';
import { UserAccessType } from '../types';

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

describe('event CRUD operations', () => {
  test('events from the past, future, and all time can be pulled', async () => {
    const conn = await DatabaseConnection.get();
    const [pastEvent] = EventFactory.with({
      start: moment().subtract(1, 'day').toDate(),
      end: moment().subtract(1, 'day').add(60, 'minutes').toDate(),
    });
    const [ongoingEvent] = EventFactory.with({
      start: moment().subtract(30, 'minutes').toDate(),
      end: moment().add(30, 'minutes').toDate(),
    });
    const [futureEvent] = EventFactory.with({
      start: moment().add(1, 'day').toDate(),
      end: moment().add(1, 'day').add(60, 'minutes').toDate(),
    });
    const [user] = UserFactory.create(1);

    await new PortalState()
      .createEvents([pastEvent, ongoingEvent, futureEvent])
      .createUsers([user])
      .write();

    const eventController = ControllerFactory.event(conn);

    const pastEventsResponse = await eventController.getPastEvents({}, user);
    const futureEventsResponse = await eventController.getFutureEvents({}, user);
    const allEventsResponse = await eventController.getAllEvents({}, user);

    expect(pastEventsResponse.events).toEqual(
      expect.arrayContaining([pastEvent.getPublicEvent()]),
    );
    expect(futureEventsResponse.events).toEqual(
      expect.arrayContaining([
        ongoingEvent.getPublicEvent(),
        futureEvent.getPublicEvent(),
      ]),
    );
    expect(allEventsResponse.events).toEqual(
      expect.arrayContaining([
        pastEvent.getPublicEvent(),
        ongoingEvent.getPublicEvent(),
        futureEvent.getPublicEvent(),
      ]),
    );
  });

  test('events can be created with unused attendance codes', async () => {
    const conn = await DatabaseConnection.get();
    const [event1] = EventFactory.with({ attendanceCode: 'code' });
    const [event2] = EventFactory.with({ attendanceCode: 'different-code' });
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createEvents([event1])
      .createUsers([admin])
      .write();

    const createEventResponse = await ControllerFactory.event(conn).createEvent({ event: event2 }, admin);

    expect(createEventResponse.error).toBeNull();
  });

  test('events cannot be created with duplicate attendance codes', async () => {
    const conn = await DatabaseConnection.get();
    const [event1] = EventFactory.with({ attendanceCode: 'code' });
    const [event2] = EventFactory.with({ attendanceCode: 'code' });
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createEvents([event1])
      .createUsers([admin])
      .write();

    const eventController = ControllerFactory.event(conn);
    const errorMessage = 'Attendance code has already been used';

    await expect(
      eventController.createEvent({ event: event2 }, admin),
    ).rejects.toThrow(errorMessage);

    const eventsResponse = await eventController.getAllEvents({}, admin);

    expect(eventsResponse.events).toHaveLength(1);
  });
});

describe('event covers', () => {
  test('properly updates cover photo in database and on S3', async () => {

  });
});

describe('event feedback', () => {
  test('can be persisted and rewarded points when submitted for an event already attended', async () => {

  });

  test('is rejected on submission to an event not attended', async () => {

  });

  test('is rejected if submitted to an event multiple times', async () => {

  });

  test('is rejected if sent after 2 days of event completion', async () => {

  });
});
