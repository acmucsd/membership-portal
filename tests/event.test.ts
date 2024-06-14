import * as moment from 'moment';
import { ForbiddenError } from 'routing-controllers';
import { FeedbackStatus, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { CreateEventRequest } from '../api/validators/EventControllerRequests';
import { EventModel } from '../models/EventModel';
import { FeedbackFactory } from './data/FeedbackFactory';

function buildFeedbackRequest(feedback) {
  return {
    feedback: {
      event: feedback.event.uuid,
      source: feedback.source,
      status: feedback.status,
      type: feedback.type,
      description: feedback.description,
    },
  };
}

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

  test('admin can view all feedback for any event', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const [member1, member2] = UserFactory.create(2);
    const event1 = EventFactory.fake();
    const event2 = EventFactory.fake();
    const feedback1 = FeedbackFactory.fake({ event: event1, user: member1 });
    const feedback2 = FeedbackFactory.fake({ event: event1, user: member2 });
    const feedback3 = FeedbackFactory.fake({ event: event2, user: member1 });

    await new PortalState()
      .createUsers(admin, member1, member2)
      .createEvents(event1, event2)
      .write();

    const eventController = ControllerFactory.event(conn);
    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback1), member1);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback2), member2);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback3), member1);

    const event1Feedback = await eventController.getFeedbackByEvent({ uuid: event1.uuid }, admin);
    const event2Feedback = await eventController.getFeedbackByEvent({ uuid: event2.uuid }, admin);
    const event1Sorted = event1Feedback.feedback.sort();

    expect(event1Feedback.feedback).toHaveLength(2);
    expect(event2Feedback.feedback).toHaveLength(1);

    expect(event2Feedback.feedback[0]).toMatchObject({
      ...event2Feedback.feedback[0],
      user: member1.getPublicProfile(),
      event: event2.getPublicEvent(),
      source: feedback3.source,
      description: feedback3.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback3.type,
    });

    expect(event1Sorted[1]).toMatchObject({
      ...event1Sorted[1],
      user: member1.getPublicProfile(),
      event: event1.getPublicEvent(),
      source: feedback1.source,
      description: feedback1.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback1.type,
    });

    expect(event1Sorted[0]).toMatchObject({
      ...event1Sorted[0],
      user: member2.getPublicProfile(),
      event: event1.getPublicEvent(),
      source: feedback2.source,
      description: feedback2.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback2.type,
    });
  });

  test('members cannot view all feedback for event', async () => {
    // setting up inputs
    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const event1 = EventFactory.fake();
    const feedback1 = FeedbackFactory.fake({ event: event1, user: member1 });

    await new PortalState()
      .createUsers(member1, member2)
      .createEvents(event1)
      .write();

    const eventController = ControllerFactory.event(conn);
    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback1), member1);

    const errorMessage = 'Incorrect permissions to view event feedback';

    await expect(eventController.getFeedbackByEvent({ uuid: event1.uuid }, member1))
      .rejects.toThrow(errorMessage);
  });
});
