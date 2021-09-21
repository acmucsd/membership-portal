import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { Config } from '../config';
import { ControllerFactory } from './controllers';

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
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    await feedbackController.submitFeedback({ feedback }, member);
    const submittedFeedbackResponse = await feedbackController.getFeedback(member);

    expect(submittedFeedbackResponse.feedback).toHaveLength(1);
    expect(submittedFeedbackResponse.feedback[0]).toStrictEqual({
      ...submittedFeedbackResponse.feedback[0],
      user: member.getPublicProfile(),
      status: FeedbackStatus.SUBMITTED,
      ...feedback,
    });
  });

  test('is invalidated when submission description is too short', async () => {
    const feedback = FeedbackFactory.fake({ description: 'A short description' });

    const errors = await validate(plainToClass(Feedback, feedback));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('description');
    expect(errors[0].constraints.minLength).toBeDefined();
  });

  test('has proper activity scope and type', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const feedback = FeedbackFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    await ControllerFactory.feedback(conn).submitFeedback({ feedback }, member);
    const activityResponse = await ControllerFactory.user(conn).getCurrentUserActivityStream(member);
    const feedbackSubmissionActivity = activityResponse.activity[1];

    expect(feedbackSubmissionActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackSubmissionActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
  });

  test('admins can view feedback from any member', async () => {
    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState()
      .createUsers(member1, member2, admin)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedback1Response = await feedbackController.submitFeedback({ feedback: feedback1 }, member1);
    const submittedFeedback2Response = await feedbackController.submitFeedback({ feedback: feedback2 }, member2);
    const allSubmittedFeedbackResponse = await feedbackController.getFeedback(admin);

    expect(allSubmittedFeedbackResponse.feedback).toHaveLength(2);
    expect(allSubmittedFeedbackResponse.feedback).toEqual(
      expect.arrayContaining([submittedFeedback1Response.feedback, submittedFeedback2Response.feedback]),
    );
  });

  test('members can view only their own feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [member1, member2] = UserFactory.create(2);
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState()
      .createUsers(member1, member2)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback({ feedback: feedback1 }, member1);
    await feedbackController.submitFeedback({ feedback: feedback2 }, member2);
    const user1Feedback = await feedbackController.getFeedback(member1);

    expect(user1Feedback.feedback).toHaveLength(1);
    expect(user1Feedback.feedback[0]).toMatchObject(feedback1);
  });

  test('admin can acknowledge and reward points for feedback', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback = FeedbackFactory.fake();

    await new PortalState()
      .createUsers(member, admin)
      .write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, member);

    const status = FeedbackStatus.ACKNOWLEDGED;
    const uuid = submittedFeedbackResponse.feedback;
    const acknowledgedFeedback = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: member.uuid }, admin);

    const feedbackPointReward = Config.pointReward.FEEDBACK_POINT_REWARD;

    expect(acknowledgedFeedback.feedback.status).toEqual(FeedbackStatus.ACKNOWLEDGED);
    expect(persistedUserResponse.user.points).toEqual(member.points + feedbackPointReward);
  });

  test('admin can ignore and not reward points for feedback', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const feedback = FeedbackFactory.fake();

    await new PortalState()
      .createUsers(member, admin)
      .write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, member);
    const status = FeedbackStatus.IGNORED;
    const uuid = submittedFeedbackResponse.feedback;
    const ignoredFeedbackResponse = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: member.uuid }, admin);

    expect(ignoredFeedbackResponse.feedback.status).toEqual(FeedbackStatus.IGNORED);
    expect(persistedUserResponse.user.points).toEqual(member.points);
  });

  test('cannot be responded to after already being responded to', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState()
      .createUsers(member, admin)
      .write();

    const feedbackController = ControllerFactory.feedback(conn);

    const feedbackToAcknowledgeResponse = await feedbackController.submitFeedback({ feedback: feedback1 }, member);
    const feedbackToIgnoreResponse = await feedbackController.submitFeedback({ feedback: feedback2 }, member);

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
});
