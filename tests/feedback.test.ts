import { FeedbackRepository } from "repositories/FeedbackRepository";
import FeedbackService from "../services/FeedbackService";
import Container from "typedi";
import { FeedbackController } from "../api/controllers/FeedbackController";
import { DatabaseConnection, PortalState, UserFactory } from "./data";
import { FeedbackFactory } from "./data/FeedbackFactory";
import { useContainer as routingUseContainer } from 'routing-controllers';
import { useContainer as ormUseContainer } from 'typeorm';
import { FeedbackModel } from "../models/FeedbackModel";


let feedbackService: FeedbackService;

beforeAll(async () => {
  routingUseContainer(Container);
  ormUseContainer(Container);
  await DatabaseConnection.connect();
  feedbackService = Container.get(FeedbackService);
});

beforeEach(async () => {
  await DatabaseConnection.clear();
});

afterAll(async () => {
  await DatabaseConnection.clear();
  await DatabaseConnection.close();
});


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

  const feedbackController = new FeedbackController(feedbackService);


  const response1 = await feedbackController.getFeedback(user1);
  const response2 = await feedbackController.getFeedback(user2);
  const submittedFeedback1 = response1.feedback;
  const submittedFeedback2 = response2.feedback;

  console.log(submittedFeedback1)
  console.log(feedback1);
  
  // submittedFeedback1.forEach(feedback => {
  //   expect(feedback).toMatchObject(feedback1)
  // })

  expect(submittedFeedback1).toEqual(
    expect.arrayContaining([feedback1.forEach(feedback => {
      expect.objectContaining(feedback)
    })])
  )
  expect(submittedFeedback2).toMatchObject(feedback2);

});

test('returns feedback for all users if user is an admin', async () => {
  //
});
