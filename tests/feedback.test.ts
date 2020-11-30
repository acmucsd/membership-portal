import { DatabaseConnection, PortalState, UserFactory } from './data';
import { FeedbackFactory } from './data/FeedbackFactory';
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

describe('GET /feedback', () => {
  test('returns feedback for current user if user is not an admin', async () => {
    const conn = await DatabaseConnection.get();

    const [user1, user2] = UserFactory.create(2);
    const feedback1 = FeedbackFactory.create(2);
    const feedback2 = FeedbackFactory.create(2);

    const state = new PortalState()
      .createUsers([user1, user2])
      .submitFeedback(user1, feedback1)
      .submitFeedback(user2, feedback2);

    await state.write(conn);

    const feedbackController = ControllerFactory.feedback(conn);
    const response1 = await feedbackController.getFeedback(user1);
    const response2 = await feedbackController.getFeedback(user2);
    const submittedFeedback1 = response1.feedback;
    const submittedFeedback2 = response2.feedback;

    expect(submittedFeedback1).toHaveLength(feedback1.length);
    expect(submittedFeedback2).toHaveLength(feedback2.length);

    expect(submittedFeedback1).toMatchArrayContents(feedback1, 'title');
    expect(submittedFeedback2).toMatchArrayContents(feedback2, 'title');
  });

  test('returns feedback for all users if user is an admin', async () => {
    // TODO
  });
});

describe('POST /feedback', () => {
  // TODO
});

describe('PATCH /feedback/:uuid', () => {
  // TODO
});
