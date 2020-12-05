import { DatabaseConnection, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
import { FeedbackControllerMock } from './controllers';
import { ActivityScope, ActivityType, FeedbackStatus, UserAccessType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { FeedbackModel } from '../models/FeedbackModel';

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

    await FeedbackControllerMock.mockUsers([user]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);

    expect(submittedFeedback.user).toStrictEqual(user.getPublicProfile());
    expect(submittedFeedback.status).toStrictEqual(FeedbackStatus.SUBMITTED);
    expect(submittedFeedback).toMatchObject(feedback);
  });

  test('returns error response when submission description is too short', async () => {

  });

  test('persists submission data and activity in database on successful submission', async () => {
    const [user] = UserFactory.create(1);
    const [feedback] = FeedbackFactory.create(1);

    await FeedbackControllerMock.mockUsers([user]);
    const submittedFeedback = await FeedbackControllerMock.submitFeedback(feedback, user);

    const conn = await DatabaseConnection.get();
    const [persistedFeedback] = await conn.manager.find(FeedbackModel, { relations: ['user'] });
    const activity = await conn.manager.find(ActivityModel, { relations: ['user'] });
    const feedbackActivity = activity[1];

    expect(submittedFeedback).toStrictEqual(persistedFeedback.getPublicFeedback());
    expect(feedbackActivity.type).toEqual(ActivityType.SUBMIT_FEEDBACK);
    expect(feedbackActivity.scope).toEqual(ActivityScope.PRIVATE);
    expect(feedbackActivity.user).toStrictEqual(user);
  });

  test('is visible from all users if user is admin, otherwise from only current user', async () => {
    const [user1, user2] = UserFactory.create(2);
    const [admin] = UserFactory.with({ accessType: UserAccessType.ADMIN });
    const [feedback1, feedback2] = FeedbackFactory.create(2);

    await FeedbackControllerMock.mockUsers([user1, user2, admin]);
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

  });

  test('can be ignored and not rewarded anything by admin', async () => {

  });

  test('cannot be ackowledged or ignored after previously being acknowledged or ignored', async () => {

  });
});
