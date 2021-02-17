import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { DatabaseConnection, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { FeedbackControllerMock } from './controllers';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { FeedbackModel } from '../models/FeedbackModel';
import { Feedback } from '../api/validators/FeedbackControllerRequests';
import { UserModel } from '../models/UserModel';
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

describe('feedback submission', () => {
  test('returns proper feedback response on successful submission', async () => {
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await FeedbackControllerMock.mock([user]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);

    expect(submittedFeedback).toStrictEqual({
      ...submittedFeedback,
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
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await FeedbackControllerMock.mock([user]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);

    const conn = await DatabaseConnection.get();
    const [persistedFeedback] = await conn.manager.find(FeedbackModel, { relations: ['user'] });
    const activity = await conn.manager.find(ActivityModel, { relations: ['user'] });
    const feedbackSubmissionActivity = { ...activity[1] };

    expect(submittedFeedback).toStrictEqual(persistedFeedback.getPublicFeedback());
    expect(feedbackSubmissionActivity).toStrictEqual({
      ...feedbackSubmissionActivity,
      type: ActivityType.SUBMIT_FEEDBACK,
      scope: ActivityScope.PRIVATE,
      user,
    });
  });

  test('admins can view feedback from any user', async () => {
    const [user1, user2] = UserFactory.create(2);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mock([user1, user2, admin]);
    const submittedFeedback1 = await FeedbackControllerMock.submitFeedback(feedback1, user1);
    const submittedFeedback2 = await FeedbackControllerMock.submitFeedback(feedback2, user2);

    const allSubmittedFeedback = await FeedbackControllerMock.getFeedback(admin);

    expect(submittedFeedback1).toMatchObject(feedback1);
    expect(submittedFeedback2).toMatchObject(feedback2);
    expect(allSubmittedFeedback).toHaveLength(2);
    expect(allSubmittedFeedback).toEqual(expect.arrayContaining([submittedFeedback1, submittedFeedback2]));
  });

  test('members can view only their own feedback', async () => {
    const [user1, user2] = UserFactory.create(2);
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mock([user1, user2]);
    await FeedbackControllerMock.submitFeedback(feedback1, user1);
    await FeedbackControllerMock.submitFeedback(feedback2, user2);

    const user1Feedback = await FeedbackControllerMock.getFeedback(user1);

    expect(user1Feedback).toHaveLength(1);
    expect(user1Feedback[0]).toMatchObject(feedback1);
  });

  test('admin can acknowledge and reward points for feedback', async () => {
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback] = FeedbackFactory.create(1);

    await FeedbackControllerMock.mock([user, admin]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);
    const acknowledgedFeedback = await FeedbackControllerMock.acknowledgeFeedback(submittedFeedback.uuid, admin);

    const conn = await DatabaseConnection.get();
    const persistedUser = await conn.manager.findOne(UserModel, { where: { uuid: user.uuid } });
    const feedbackPointReward = Config.pointReward.FEEDBACK_POINT_REWARD;

    expect(acknowledgedFeedback.status).toEqual(FeedbackStatus.ACKNOWLEDGED);
    expect(persistedUser.points).toEqual(user.points + feedbackPointReward);
  });

  test('admin can ignore and not reward points for feedback', async () => {
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback] = FeedbackFactory.create(1);

    await FeedbackControllerMock.mock([user, admin]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);
    const ignoredFeedback = await FeedbackControllerMock.ignoreFeedback(submittedFeedback.uuid, admin);

    const conn = await DatabaseConnection.get();
    const persistedUser = await conn.manager.findOne(UserModel, { where: { uuid: user.uuid } });

    expect(ignoredFeedback.status).toEqual(FeedbackStatus.IGNORED);
    expect(persistedUser.points).toEqual(user.points);
  });

  test('cannot be responded to after already being responded to', async () => {
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mock([user, admin]);
    const feedbackToAcknowledge = await FeedbackControllerMock.submitFeedback(feedback1, user);
    const feedbackToIgnore = await FeedbackControllerMock.submitFeedback(feedback2, user);

    await FeedbackControllerMock.acknowledgeFeedback(feedbackToAcknowledge.uuid, admin);
    await FeedbackControllerMock.ignoreFeedback(feedbackToIgnore.uuid, admin);

    const errorMessage = 'This feedback has already been responded to';

    await expect(
      FeedbackControllerMock.acknowledgeFeedback(feedbackToAcknowledge.uuid, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      FeedbackControllerMock.acknowledgeFeedback(feedbackToIgnore.uuid, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      FeedbackControllerMock.ignoreFeedback(feedbackToAcknowledge.uuid, admin),
    ).rejects.toThrow(errorMessage);
    await expect(
      FeedbackControllerMock.ignoreFeedback(feedbackToIgnore.uuid, admin),
    ).rejects.toThrow(errorMessage);
  });
});
