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

    expect(submittedFeedback.user).toStrictEqual(user.getPublicProfile());
    expect(submittedFeedback.status).toStrictEqual(FeedbackStatus.SUBMITTED);
    expect(submittedFeedback).toMatchObject(feedback);
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
    const feedbackSubmissionActivity = activity[1];

    expect(submittedFeedback).toStrictEqual(persistedFeedback.getPublicFeedback());
    expect(feedbackSubmissionActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
    expect(feedbackSubmissionActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackSubmissionActivity.user).toStrictEqual(user);
  });

  test('is visible from all users if user is admin, otherwise from only current user', async () => {
    const [user1, user2] = UserFactory.create(2);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mock([user1, user2, admin]);
    await FeedbackControllerMock.submitFeedback(feedback1, user1);
    await FeedbackControllerMock.submitFeedback(feedback2, user2);

    const submittedFeedback1 = await FeedbackControllerMock.getFeedback(user1);
    const submittedFeedback2 = await FeedbackControllerMock.getFeedback(user2);
    const allSubmittedFeedback = await FeedbackControllerMock.getFeedback(admin);

    expect(submittedFeedback1).toHaveLength(1);
    expect(submittedFeedback2).toHaveLength(1);
    expect(submittedFeedback1[0]).toMatchObject(feedback1);
    expect(submittedFeedback2[0]).toMatchObject(feedback2);
    expect(allSubmittedFeedback).toHaveLength(2);
    expect(allSubmittedFeedback).toEqual(expect.arrayContaining([...submittedFeedback1, ...submittedFeedback2]));
  });

  test('can be acknowledged and rewarded points by admin', async () => {
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

  test('can be ignored and not rewarded anything by admin', async () => {
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

  test('cannot be ackowledged or ignored after already being acknowledged or ignored', async () => {
    const [user] = UserFactory.create(1);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mock([user, admin]);
    const submittedFeedback1 = await FeedbackControllerMock.submitFeedback(feedback1, user);
    const submittedFeedback2 = await FeedbackControllerMock.submitFeedback(feedback2, user);

    const uuid1 = submittedFeedback1.uuid;
    const uuid2 = submittedFeedback2.uuid;

    await FeedbackControllerMock.acknowledgeFeedback(uuid1, admin);
    await FeedbackControllerMock.ignoreFeedback(uuid2, admin);

    const acknowledgeAcknowledgedFeedback = () => FeedbackControllerMock.acknowledgeFeedback(uuid1, admin);
    const ignoreAckowledgedFeedback = () => FeedbackControllerMock.acknowledgeFeedback(uuid2, admin);
    const acknowledgeIgnoredFeedback = () => FeedbackControllerMock.ignoreFeedback(uuid1, admin);
    const ignoreIgnoredFeedback = () => FeedbackControllerMock.ignoreFeedback(uuid2, admin);

    await expect(acknowledgeAcknowledgedFeedback()).rejects.toThrow('This feedback has already been responded to');
    await expect(ignoreAckowledgedFeedback()).rejects.toThrow('This feedback has already been responded to');
    await expect(acknowledgeIgnoredFeedback()).rejects.toThrow('This feedback has already been responded to');
    await expect(ignoreIgnoredFeedback()).rejects.toThrow('This feedback has already been responded to');
  });
});
