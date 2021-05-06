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
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await new PortalState().createUsers([user]).write();

    const feedbackController = ControllerFactory.feedback(conn);

    await feedbackController.submitFeedback({ feedback }, user);
    const submittedFeedbackResponse = await feedbackController.getFeedback(user);

    expect(submittedFeedbackResponse.feedback).toHaveLength(1);
    expect(submittedFeedbackResponse.feedback[0]).toStrictEqual({
      ...submittedFeedbackResponse.feedback[0],
      user: user.getPublicProfile(),
      status: FeedbackStatus.SUBMITTED,
      ...feedback,
    });
  });

  test('is invalidated when submission description is too short', async () => {
    const [feedback] = FeedbackFactory.with({ description: 'A short description' });

    const errors = await validate(plainToClass(Feedback, feedback));

    expect(errors).toBeDefined();
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toEqual('description');
    expect(errors[0].constraints.minLength).toBeDefined();
  });

  test('has proper activity scope and type', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await new PortalState().createUsers([user]).write();

    await ControllerFactory.feedback(conn).submitFeedback({ feedback }, user);
    const activityResponse = await ControllerFactory.user(conn).getCurrentUserActivityStream(user);
    const feedbackSubmissionActivity = activityResponse.activity[1];

    expect(feedbackSubmissionActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackSubmissionActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
  });

  test('admins can view feedback from any user', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState().createUsers([user1, user2, admin]).write();

    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedback1Response = await feedbackController.submitFeedback({ feedback: feedback1 }, user1);
    const submittedFeedback2Response = await feedbackController.submitFeedback({ feedback: feedback2 }, user2);
    const allSubmittedFeedbackResponse = await feedbackController.getFeedback(admin);

    expect(allSubmittedFeedbackResponse.feedback).toHaveLength(2);
    expect(allSubmittedFeedbackResponse.feedback).toEqual(
      expect.arrayContaining([submittedFeedback1Response.feedback, submittedFeedback2Response.feedback]),
    );
  });

  test('members can view only their own feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState().createUsers([user1, user2]).write();

    const feedbackController = ControllerFactory.feedback(conn);
    await feedbackController.submitFeedback({ feedback: feedback1 }, user1);
    await feedbackController.submitFeedback({ feedback: feedback2 }, user2);
    const user1Feedback = await feedbackController.getFeedback(user1);

    expect(user1Feedback.feedback).toHaveLength(1);
    expect(user1Feedback.feedback[0]).toMatchObject(feedback1);
  });

  test('admin can acknowledge and reward points for feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback] = FeedbackFactory.create(1);

    await new PortalState().createUsers([user, admin]).write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, user);

    const status = FeedbackStatus.ACKNOWLEDGED;
    const { uuid } = submittedFeedbackResponse.feedback;
    const acknowledgedFeedback = await feedbackController.updateFeedbackStatus({ uuid }, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: user.uuid }, admin);

    const feedbackPointReward = Config.pointReward.FEEDBACK_POINT_REWARD;

    expect(acknowledgedFeedback.feedback.status).toEqual(FeedbackStatus.ACKNOWLEDGED);
    expect(persistedUserResponse.user.points).toEqual(user.points + feedbackPointReward);
  });

  test('admin can ignore and not reward points for feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback] = FeedbackFactory.create(1);

    await new PortalState().createUsers([user, admin]).write();

    const userController = ControllerFactory.user(conn);
    const feedbackController = ControllerFactory.feedback(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, user);
    const status = FeedbackStatus.IGNORED;
    const uuid = submittedFeedbackResponse.feedback;
    const ignoredFeedbackResponse = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUserResponse = await userController.getUser({ uuid: user.uuid }, admin);

    expect(ignoredFeedbackResponse.feedback.status).toEqual(FeedbackStatus.IGNORED);
    expect(persistedUserResponse.user.points).toEqual(user.points);
  });

  test('cannot be responded to after already being responded to', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await new PortalState().createUsers([user, admin]).write();

    const feedbackController = ControllerFactory.feedback(conn);
    const feedbackToAcknowledgeResponse = await feedbackController.submitFeedback({ feedback: feedback1 }, user);
    const feedbackToIgnoreResponse = await feedbackController.submitFeedback({ feedback: feedback2 }, user);

    await feedbackController.updateFeedbackStatus(
      { uuid: feedbackToAcknowledgeResponse.feedback.uuid }, { status: FeedbackStatus.ACKNOWLEDGED }, admin,
    );
    await feedbackController.updateFeedbackStatus(
      { uuid: feedbackToIgnoreResponse.feedback.uuid }, { status: FeedbackStatus.IGNORED }, admin,
    );

    const errorMessage = 'This feedback has already been responded to';

    await expect(
      feedbackController.updateFeedbackStatus({ uuid: feedbackToAcknowledgeResponse.feedback.uuid },
        { status: FeedbackStatus.ACKNOWLEDGED }, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus({ uuid: feedbackToAcknowledgeResponse.feedback.uuid },
        { status: FeedbackStatus.IGNORED }, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus({ uuid: feedbackToIgnoreResponse.feedback.uuid },
        { status: FeedbackStatus.ACKNOWLEDGED }, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus({ uuid: feedbackToIgnoreResponse.feedback.uuid },
        { status: FeedbackStatus.IGNORED }, admin),
    ).rejects.toThrow(errorMessage);
  });
});
