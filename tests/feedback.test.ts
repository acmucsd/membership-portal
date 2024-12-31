import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { ControllerFactory } from './controllers';

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

describe('feedback submission', () => {
  test('users can submit feedback', async () => {
    const event = EventFactory.fake();
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const submittedFeedbackResponse = await feedbackController.submitFeedback(buildFeedbackRequest(feedback), member);

    // check response
    expect(submittedFeedbackResponse.feedback.description).toEqual(feedback.description);
    expect(submittedFeedbackResponse.feedback.source).toEqual(feedback.source);
    expect(submittedFeedbackResponse.feedback.type).toEqual(feedback.type);
    expect(submittedFeedbackResponse.feedback.status).toEqual(FeedbackStatus.SUBMITTED);
    expect(submittedFeedbackResponse.feedback.event.uuid).toEqual(feedback.event.uuid);

    // check if it persists
    const queriedFeedback = await feedbackController.getEventFeedback({ uuid: event.uuid }, member);
    expect(queriedFeedback.feedback).toHaveLength(1);

    expect(queriedFeedback.feedback[0]).toEqual({
      ...submittedFeedbackResponse.feedback,
      user: member.getPublicProfile(),
      event: event.getPublicEvent(),
      source: feedback.source,
      description: feedback.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback.type,
    });
  });

  test('is invalidated when submission description is too short', async () => {
    const event = EventFactory.fake();

    const feedback = FeedbackFactory.fake({ event, description: 'A short description' });

    const errors = await validate(plainToClass(Feedback, feedback));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('description');
    expect(errors[0].constraints.minLength).toBeDefined();
  });

  test('has proper activity scope and type', async () => {
    const event = EventFactory.fake();

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    await ControllerFactory.feedback(conn).submitFeedback(buildFeedbackRequest(feedback), member);
    const activityResponse = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const feedbackSubmissionActivity = activityResponse.activity[1];

    expect(feedbackSubmissionActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackSubmissionActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
  });

  test('members can view only their own feedback for any event', async () => {
    const event = EventFactory.fake();

    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const feedback1 = FeedbackFactory.fake({ event, user: member1 });
    const feedback2 = FeedbackFactory.fake({ event, user: member2 });

    await new PortalState()
      .createUsers(member1, member2)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback1), member1);
    await feedbackController.submitFeedback(buildFeedbackRequest(feedback2), member2);
    const user1Feedback = await feedbackController.getEventFeedback({ uuid: event.uuid }, member1);

    expect(user1Feedback.feedback).toHaveLength(1);

    expect(user1Feedback.feedback[0]).toMatchObject({
      ...user1Feedback.feedback[0],
      user: member1.getPublicProfile(),
      event: event.getPublicEvent(),
      source: feedback1.source,
      description: feedback1.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback1.type,
    });
  });

  test('cannot be responded to after already being responded to', async () => {
    const event = EventFactory.fake();

    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event, user: member1 });
    const feedback2 = FeedbackFactory.fake({ event, user: member2 });

    await new PortalState()
      .createUsers(member1, member2, admin)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    const feedbackToAcknowledgeResponse = await feedbackController.submitFeedback(
      buildFeedbackRequest(feedback1), member1,
    );
    const feedbackToIgnoreResponse = await feedbackController.submitFeedback(
      buildFeedbackRequest(feedback2), member2,
    );

    const feedbackToAcknowledgeParams = { uuid: feedbackToAcknowledgeResponse.feedback.uuid };
    const acknowledged = { status: FeedbackStatus.ACKNOWLEDGED };

    const feedbackToIgnoreParams = { uuid: feedbackToIgnoreResponse.feedback.uuid };
    const ignored = { status: FeedbackStatus.IGNORED };

    await feedbackController.updateFeedbackStatus(feedbackToAcknowledgeParams, acknowledged, admin);
    await feedbackController.updateFeedbackStatus(feedbackToIgnoreParams, ignored, admin);

    const errorMessage = 'This feedback has already been responded to';
    await expect(feedbackController.updateFeedbackStatus(feedbackToAcknowledgeParams, acknowledged, admin))
      .rejects.toThrow(errorMessage);

    await expect(feedbackController.updateFeedbackStatus(feedbackToIgnoreParams, ignored, admin))
      .rejects.toThrow(errorMessage);
  });
});
