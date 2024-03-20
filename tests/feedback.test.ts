import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { ActivityScope, ActivityType, FeedbackStatus, FeedbackType, UserAccessType } from '../types';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { Config } from '../config';
import { ControllerFactory } from './controllers';

function buildFeedbackPartial(feedback) {
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
  test('properly persists on successful submission', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    await feedbackController.submitFeedback(buildFeedbackPartial(feedback), member);
    const submittedFeedbackResponse = await feedbackController.getFeedback({}, member);

    expect(submittedFeedbackResponse.feedback).toHaveLength(1);

    expect(submittedFeedbackResponse.feedback[0]).toEqual({
      ...submittedFeedbackResponse.feedback[0],
      user: member.getPublicProfile(),
      event: event.getPublicEvent(),
      source: feedback.source,
      description: feedback.description,
      status: FeedbackStatus.SUBMITTED,
      type: feedback.type,
    });
  });

  test('is invalidated when submission description is too short', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const feedback = FeedbackFactory.fake({ event, description: 'A short description' });

    const errors = await validate(plainToClass(Feedback, feedback));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('description');
    expect(errors[0].constraints.minLength).toBeDefined();
  });

  test('has proper activity scope and type', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member)
      .createEvents(event)
      .write();

    await ControllerFactory.feedback(conn).submitFeedback(buildFeedbackPartial(feedback), member);
    const activityResponse = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const feedbackSubmissionActivity = activityResponse.activity[1];

    expect(feedbackSubmissionActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackSubmissionActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
  });

  test('admins can view feedback from any member', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event });
    const feedback2 = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member1, member2, admin)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedback1Response = await feedbackController.submitFeedback(
      buildFeedbackPartial(feedback1), member1,
    );
    const submittedFeedback2Response = await feedbackController.submitFeedback(
      buildFeedbackPartial(feedback2), member2,
    );
    const allSubmittedFeedbackResponse = await feedbackController.getFeedback({}, admin);

    expect(allSubmittedFeedbackResponse.feedback).toHaveLength(2);

    expect(allSubmittedFeedbackResponse.feedback).toEqual(
      expect.arrayContaining([
        submittedFeedback1Response.feedback,
        submittedFeedback2Response.feedback,
      ]),
    );
  });

  test('members can view only their own feedback', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const feedback1 = FeedbackFactory.fake({ event, user: member1 });
    const feedback2 = FeedbackFactory.fake({ event, user: member2 });

    await new PortalState()
      .createUsers(member1, member2)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member1);
    await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member2);
    const user1Feedback = await feedbackController.getFeedback({}, member1);

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

  test('admin can acknowledge and reward points for feedback', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event)
      .write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback(buildFeedbackPartial(feedback), member);

    const status = FeedbackStatus.ACKNOWLEDGED;
    const uuid = submittedFeedbackResponse.feedback;

    const acknowledgedFeedback = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: member.uuid }, admin);

    const feedbackPointReward = Config.pointReward.FEEDBACK_POINT_REWARD;

    expect(acknowledgedFeedback.feedback.status).toEqual(FeedbackStatus.ACKNOWLEDGED);
    expect(persistedUserResponse.user.points).toEqual(member.points + feedbackPointReward);
  });

  test('admin can ignore and not reward points for feedback', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
  neural networks (NNs), are computing systems vaguely inspired by the
  biological neural networks that constitute animal brains. An ANN is based
  on a collection of connected units or nodes called artificial neurons,
  which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback = FeedbackFactory.fake({ event });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event)
      .write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback(buildFeedbackPartial(feedback), member);
    const status = FeedbackStatus.IGNORED;
    const uuid = submittedFeedbackResponse.feedback;
    const ignoredFeedbackResponse = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: member.uuid }, admin);

    expect(ignoredFeedbackResponse.feedback.status).toEqual(FeedbackStatus.IGNORED);
    expect(persistedUserResponse.user.points).toEqual(member.points);
  });

  test('cannot be responded to after already being responded to', async () => {
    const event = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event, user: member });
    const feedback2 = FeedbackFactory.fake({ event, user: member });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    const feedbackToAcknowledgeResponse = await feedbackController.submitFeedback(
      buildFeedbackPartial(feedback1), member,
    );
    const feedbackToIgnoreResponse = await feedbackController.submitFeedback(
      buildFeedbackPartial(feedback2), member,
    );

    const feedbackToAcknowledgeParams = { uuid: feedbackToAcknowledgeResponse.feedback.uuid };
    const feedbackToIgnoreParams = { uuid: feedbackToIgnoreResponse.feedback.uuid };
    const acknowledged = { status: FeedbackStatus.ACKNOWLEDGED };
    const ignored = { status: FeedbackStatus.IGNORED };

    await feedbackController.updateFeedbackStatus(feedbackToAcknowledgeParams, acknowledged, admin);
    await feedbackController.updateFeedbackStatus(feedbackToIgnoreParams, ignored, admin);

    const errorMessage = 'This feedback has already been responded to';
    await expect(feedbackController.updateFeedbackStatus(feedbackToAcknowledgeParams, acknowledged, admin))
      .rejects.toThrow(errorMessage);
    await expect(feedbackController.updateFeedbackStatus(feedbackToAcknowledgeParams, ignored, admin))
      .rejects.toThrow(errorMessage);
    await expect(feedbackController.updateFeedbackStatus(feedbackToIgnoreParams, acknowledged, admin))
      .rejects.toThrow(errorMessage);
    await expect(feedbackController.updateFeedbackStatus(feedbackToIgnoreParams, ignored, admin))
      .rejects.toThrow(errorMessage);
  });

  test('get all feedback for an event', async () => {
    const event1 = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const event2 = EventFactory.fake({
      title: 'Not the right event!',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event: event1 });
    const feedback2 = FeedbackFactory.fake({ event: event1 });
    const feedback3 = FeedbackFactory.fake({ event: event2 });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event1, event2)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const fb1Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member);
    const fb2Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member);
    const fb3Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback3), member);
    const event1Feedback = await feedbackController.getFeedback({ event: event1.uuid }, admin);
    const event2Feedback = await feedbackController.getFeedback({ event: event2.uuid }, admin);

    expect(event1Feedback.feedback).toHaveLength(2);
    expect(event2Feedback.feedback).toHaveLength(1);

    expect(event1Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb2Response.feedback,
      ]),
    );

    expect(event2Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb3Response.feedback,
      ]),
    );
  });

  test('get all feedback by status', async () => {
    const event1 = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event: event1, status: FeedbackStatus.ACKNOWLEDGED });
    const feedback2 = FeedbackFactory.fake({ event: event1, status: FeedbackStatus.ACKNOWLEDGED });
    const feedback3 = FeedbackFactory.fake({ event: event1, status: FeedbackStatus.SUBMITTED });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event1)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const fb1Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member);
    const fb2Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member);
    const fb3Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback3), member);
    const status1Feedback = await feedbackController.getFeedback({ status: FeedbackStatus.ACKNOWLEDGED }, admin);
    const status2Feedback = await feedbackController.getFeedback({ status: FeedbackStatus.SUBMITTED }, admin);

    expect(status1Feedback.feedback).toHaveLength(2);
    expect(status2Feedback.feedback).toHaveLength(1);

    expect(status1Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb2Response.feedback,
      ]),
    );

    expect(status2Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb3Response.feedback,
      ]),
    );
  });

  test('get all feedback by type', async () => {
    const event1 = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event: event1, type: FeedbackType.GENERAL });
    const feedback2 = FeedbackFactory.fake({ event: event1, type: FeedbackType.GENERAL });
    const feedback3 = FeedbackFactory.fake({ event: event1, type: FeedbackType.AI });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event1)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const fb1Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member);
    const fb2Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member);
    const fb3Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback3), member);
    const type1Feedback = await feedbackController.getFeedback({ type: FeedbackType.GENERAL }, admin);
    const type2Feedback = await feedbackController.getFeedback({ type: FeedbackType.AI }, admin);

    expect(type1Feedback.feedback).toHaveLength(2);
    expect(type2Feedback.feedback).toHaveLength(1);

    expect(type1Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb2Response.feedback,
      ]),
    );

    expect(type2Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb3Response.feedback,
      ]),
    );
  });

  test('get all feedback by member', async () => {
    const event1 = EventFactory.fake({
      title: 'AI: Intro to Neural Nets',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const member2 = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event: event1 });
    const feedback2 = FeedbackFactory.fake({ event: event1 });
    const feedback3 = FeedbackFactory.fake({ event: event1 });

    await new PortalState()
      .createUsers(member, member2, admin)
      .createEvents(event1)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const fb1Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member);
    const fb2Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member);
    const fb3Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback3), member2);

    const type1Feedback = await feedbackController.getFeedback({ user: member.uuid }, admin);
    const type2Feedback = await feedbackController.getFeedback({ user: member2.uuid }, admin);

    expect(type1Feedback.feedback).toHaveLength(2);
    expect(type2Feedback.feedback).toHaveLength(1);

    expect(type1Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb2Response.feedback,
      ]),
    );

    expect(type2Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb3Response.feedback,
      ]),
    );
  });

  test('get all feedback with multiple parameters', async () => {
    const event1 = EventFactory.fake({
      title: 'Event 1',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galaxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const event2 = EventFactory.fake({
      title: 'Event 2',
      description: `Artificial neural networks (ANNs), usually simply called
      neural networks (NNs), are computing systems vaguely inspired by the
      biological neural networks that constitute animal brains. An ANN is based
      on a collection of connected units or nodes called artificial neurons,
      which loosely model the neurons in a biological brain.`,
      committee: 'AI',
      location: 'Qualcomm Room',
      ...EventFactory.daysBefore(6),
      attendanceCode: 'galxybrain',
      requiresStaff: true,
      cover: null,
      thumbnail: null,
      eventLink: null,
    });

    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback1 = FeedbackFactory.fake({ event: event1,
      status: FeedbackStatus.ACKNOWLEDGED,
      type: FeedbackType.GENERAL });
    const feedback2 = FeedbackFactory.fake({ event: event1,
      status: FeedbackStatus.IGNORED,
      type: FeedbackType.GENERAL });
    const feedback3 = FeedbackFactory.fake({ event: event1,
      status: FeedbackStatus.SUBMITTED,
      type: FeedbackType.INNOVATE });
    const feedback4 = FeedbackFactory.fake({ event: event2,
      status: FeedbackStatus.ACKNOWLEDGED,
      type: FeedbackType.GENERAL });
    const feedback5 = FeedbackFactory.fake({ event: event1,
      status: FeedbackStatus.ACKNOWLEDGED,
      type: FeedbackType.GENERAL });

    await new PortalState()
      .createUsers(member, admin)
      .createEvents(event1, event2)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    const fb1Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback1), member);
    const fb2Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback2), member);
    await feedbackController.submitFeedback(buildFeedbackPartial(feedback3), member);
    await feedbackController.submitFeedback(buildFeedbackPartial(feedback4), member);
    const fb5Response = await feedbackController.submitFeedback(buildFeedbackPartial(feedback5), member);
    const query1Feedback = await feedbackController.getFeedback({ event: event1.uuid,
      type: FeedbackType.GENERAL }, admin);
    const query2Feedback = await feedbackController.getFeedback({ event: event1.uuid,
      status: FeedbackStatus.ACKNOWLEDGED,
      type: FeedbackType.GENERAL }, admin);

    expect(query1Feedback.feedback).toHaveLength(3);
    expect(query2Feedback.feedback).toHaveLength(2);

    expect(query1Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb2Response.feedback,
        fb5Response.feedback,
      ]),
    );

    expect(query2Feedback.feedback).toEqual(
      expect.arrayContaining([
        fb1Response.feedback,
        fb5Response.feedback,
      ]),
    );
  });
});
