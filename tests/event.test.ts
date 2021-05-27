import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, EventFactory, FeedbackFactory, FileFactory, PortalState, UserFactory } from './data';
import { ControllerFactory } from './controllers';
import { UserAccessType } from '../types';
import { Config } from '../config';
import { SubmitEventFeedbackRequest } from '../api/validators/EventControllerRequests';
import Mocks from './mocks';

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
    const pastEvent = EventFactory.fakePastEvent();
    const ongoingEvent = EventFactory.fakeOngoingEvent();
    const futureEvent = EventFactory.fakeFutureEvent();
    const user = UserFactory.fake();

    await new PortalState()
      .createEvents([pastEvent, ongoingEvent, futureEvent])
      .createUsers([user])
      .write();

    const eventController = ControllerFactory.event(conn);

    const pastEventsResponse = await eventController.getPastEvents({}, user);
    expect(pastEventsResponse.events).toEqual(
      expect.arrayContaining([pastEvent.getPublicEvent()]),
    );

    const futureEventsResponse = await eventController.getFutureEvents({}, user);
    expect(futureEventsResponse.events).toEqual(
      expect.arrayContaining([
        ongoingEvent.getPublicEvent(),
        futureEvent.getPublicEvent(),
      ]),
    );

    const allEventsResponse = await eventController.getAllEvents({}, user);
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

    await expect(
      eventController.createEvent({ event: event2 }, admin),
    ).rejects.toThrow('Attendance code has already been used');

    const eventsResponse = await eventController.getAllEvents({}, admin);

    expect(eventsResponse.events).toHaveLength(1);
    expect(eventsResponse.events[0]).toStrictEqual(event1.getPublicEvent(true));
  });

  test('events can be updated by an admin', async () => {
    const conn = await DatabaseConnection.get();
    const [event] = EventFactory.with({ attendanceCode: 'code' });
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createEvents([event])
      .createUsers([admin])
      .write();

    const eventChanges = {
      title: 'new title',
      description: 'new description',
    };

    const updateEventResponse = await ControllerFactory
      .event(conn)
      .updateEvent({ uuid: event.uuid }, { event: eventChanges }, admin);

    expect(updateEventResponse.event).toMatchObject({ ...event.getPublicEvent(), ...eventChanges });
  });

  test('event attendance code cannot be updated to a duplicate one', async () => {
    const conn = await DatabaseConnection.get();
    const [event1] = EventFactory.with({ attendanceCode: 'code' });
    const [event2] = EventFactory.with({ attendanceCode: 'another-code' });
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createEvents([event1, event2])
      .createUsers([admin])
      .write();

    event1.attendanceCode = event2.attendanceCode;

    await expect(
      ControllerFactory.event(conn).updateEvent({ uuid: event1.uuid }, { event: event1 }, admin),
    ).rejects.toThrow('Attendance code has already been used');
  });
});

describe('event covers', () => {
  test('properly updates cover photo in database', async () => {
    const conn = await DatabaseConnection.get();
    const [event] = EventFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const cover = FileFactory.image(Config.file.MAX_EVENT_COVER_FILE_SIZE / 2);
    const fileLocation = 'fake location';

    await new PortalState()
      .createUsers([admin])
      .createEvents([event])
      .write();

    const eventCoverResponse = await ControllerFactory
      .event(conn, null, Mocks.storage(fileLocation))
      .updateEventCover(cover, { uuid: event.uuid }, admin);

    expect(eventCoverResponse.event.cover).toEqual(fileLocation);
  });

  test('rejects upload if file size too large', async () => {
    // TODO: implement once API wrappers exist (since multer validation can't be verified with function calls)
  });
});

describe('event feedback', () => {
  test('can be persisted and rewarded points when submitted for an event already attended', async () => {
    const conn = await DatabaseConnection.get();
    const event = EventFactory.fakeOngoingEvent();
    const user = UserFactory.fake();
    const feedback = FeedbackFactory.createEventFeedback(3);

    await new PortalState()
      .createUsers([user])
      .createEvents([event])
      .attendEvents([user], [event], false)
      .write();

    await ControllerFactory.event(conn).submitEventFeedback({ uuid: event.uuid }, { feedback }, user);

    const attendanceResponse = await ControllerFactory.attendance(conn).getAttendancesForCurrentUser(user);

    expect(attendanceResponse.attendances[0].feedback).toEqual(feedback);
    expect(user.points).toEqual(event.pointValue + Config.pointReward.EVENT_FEEDBACK_POINT_REWARD);
  });

  test('is rejected on submission to an event not attended', async () => {
    const conn = await DatabaseConnection.get();
    const event = EventFactory.fakeOngoingEvent();
    const user = UserFactory.fake();
    const feedback = FeedbackFactory.createEventFeedback(3);

    await new PortalState()
      .createUsers([user])
      .createEvents([event])
      .write();

    await expect(
      ControllerFactory.event(conn).submitEventFeedback({ uuid: event.uuid }, { feedback }, user),
    ).rejects.toThrow('You must attend this event before submiting feedback');
  });

  test('is rejected if submitted to an event multiple times', async () => {
    const conn = await DatabaseConnection.get();
    const event = EventFactory.fakeOngoingEvent();
    const user = UserFactory.fake();
    const feedback = FeedbackFactory.createEventFeedback(3);

    await new PortalState()
      .createUsers([user])
      .createEvents([event])
      .attendEvents([user], [event], false)
      .write();

    const eventController = ControllerFactory.event(conn);
    await eventController.submitEventFeedback({ uuid: event.uuid }, { feedback }, user);

    await expect(
      eventController.submitEventFeedback({ uuid: event.uuid }, { feedback }, user),
    ).rejects.toThrow('You cannot submit feedback for this event more than once');
  });

  test('is rejected if sent after 2 days of event completion', async () => {
    const conn = await DatabaseConnection.get();
    const event = EventFactory.fakePastEvent(3);
    const user = UserFactory.fake();
    const feedback = FeedbackFactory.createEventFeedback(3);

    await new PortalState()
      .createUsers([user])
      .createEvents([event])
      .attendEvents([user], [event], false)
      .write();

    await expect(
      ControllerFactory.event(conn).submitEventFeedback({ uuid: event.uuid }, { feedback }, user),
    ).rejects.toThrow('You must submit feedback within 2 days of the event ending');
  });

  test('is rejected if more than 3 feedback is provided', async () => {
    const feedback = FeedbackFactory.createEventFeedback(4);
    const errors = await validate(plainToClass(SubmitEventFeedbackRequest, { feedback }));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('feedback');
  });
});
