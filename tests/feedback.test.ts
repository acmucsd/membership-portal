import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { FeedbackModel } from '../models/FeedbackModel';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { UserModel } from '../models/UserModel';
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

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user]).write(conn);

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

  test('persists submission data and activity in database on successful submission', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await new PortalState().createUsers([user]).write(conn);

    const submittedFeedbackResponse = await ControllerFactory.feedback(conn).submitFeedback({ feedback }, user);
    const [persistedFeedback] = await conn.manager.find(FeedbackModel, { relations: ['user'] });
    const activity = await conn.manager.find(ActivityModel, { relations: ['user'] });
    const feedbackSubmissionActivity = { ...activity[1] };

    expect(submittedFeedbackResponse.feedback).toStrictEqual(persistedFeedback.getPublicFeedback());
    expect(feedbackSubmissionActivity).toStrictEqual({
      ...feedbackSubmissionActivity,
      type: ActivityType.SUBMIT_FEEDBACK,
      scope: ActivityScope.PRIVATE,
      user,
    });
  });

  test('admins can view feedback from any user', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user1, user2, admin]).write(conn);

    const submittedFeedback1Response = await feedbackController.submitFeedback({ feedback: feedback1 }, user1);
    const submittedFeedback2Response = await feedbackController.submitFeedback({ feedback: feedback2 }, user2);
    const allSubmittedFeedbackResponse = await feedbackController.getFeedback(admin);

    expect(submittedFeedback1Response.feedback).toMatchObject(feedback1);
    expect(submittedFeedback2Response.feedback).toMatchObject(feedback2);
    expect(allSubmittedFeedbackResponse.feedback).toHaveLength(2);
    expect(allSubmittedFeedbackResponse.feedback).toEqual(
      expect.arrayContaining([submittedFeedback1Response.feedback, submittedFeedback2Response.feedback]),
    );
  });

  test('members can view only their own feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user1, user2]).write(conn);

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
    const status = FeedbackStatus.ACKNOWLEDGED;

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user, admin]).write(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, user);
    const { uuid } = submittedFeedbackResponse.feedback;
    const acknowledgedFeedback = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUser = await conn.manager.findOne(UserModel, { where: { uuid: user.uuid } });
    const feedbackPointReward = Config.pointReward.FEEDBACK_POINT_REWARD;

    expect(acknowledgedFeedback.feedback.status).toEqual(FeedbackStatus.ACKNOWLEDGED);
    expect(persistedUser.points).toEqual(user.points + feedbackPointReward);
  });

  test('admin can ignore and not reward points for feedback', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback] = FeedbackFactory.create(1);
    const status = FeedbackStatus.IGNORED;

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user, admin]).write(conn);

    const submittedFeedbackResponse = await feedbackController.submitFeedback({ feedback }, user);
    const { uuid } = submittedFeedbackResponse.feedback;
    const ignoredFeedbackResponse = await feedbackController.updateFeedbackStatus(uuid, { status }, admin);

    const persistedUser = await conn.manager.findOne(UserModel, { where: { uuid: user.uuid } });

    expect(ignoredFeedbackResponse.feedback.status).toEqual(FeedbackStatus.IGNORED);
    expect(persistedUser.points).toEqual(user.points);
  });

  test('cannot be responded to after already being responded to', async () => {
    const conn = await DatabaseConnection.get();
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    const feedbackController = ControllerFactory.feedback(conn);
    await new PortalState().createUsers([user, admin]).write(conn);
    const feedbackToAcknowledgeResponse = await feedbackController.submitFeedback({ feedback: feedback1 }, user);
    const feedbackToIgnoreResponse = await feedbackController.submitFeedback({ feedback: feedback2 }, user);

    const acknowledgedFeedbackUuid = feedbackToAcknowledgeResponse.feedback.uuid;
    const ignoredFeedbackUuid = feedbackToIgnoreResponse.feedback.uuid;
    const acknowledgedStatus = { status: FeedbackStatus.ACKNOWLEDGED };
    const ignoredStatus = { status: FeedbackStatus.IGNORED };

    await feedbackController.updateFeedbackStatus(
      acknowledgedFeedbackUuid, acknowledgedStatus, admin,
    );
    await feedbackController.updateFeedbackStatus(
      ignoredFeedbackUuid, ignoredStatus, admin,
    );

    const errorMessage = 'This feedback has already been responded to';

    await expect(
      feedbackController.updateFeedbackStatus(acknowledgedFeedbackUuid, acknowledgedStatus, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus(ignoredFeedbackUuid, acknowledgedStatus, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus(acknowledgedFeedbackUuid, acknowledgedStatus, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      feedbackController.updateFeedbackStatus(ignoredFeedbackUuid, ignoredStatus, admin),
    ).rejects.toThrow(errorMessage);
  });
});
