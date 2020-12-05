import { UserModel } from '../../models/UserModel';
import { DatabaseConnection, PortalState } from '../data';
import { PublicFeedback, Feedback } from '../../types';
import { ControllerFactory } from './ControllerFactory';

export class FeedbackControllerMock {
  public static async mockUsers(users: UserModel[]): Promise<void> {
    const conn = await DatabaseConnection.connect();
    const state = new PortalState().createUsers(users);
    await state.write(conn);
  }

  public static async getFeedback(user: UserModel): Promise<PublicFeedback[]> {
    const conn = await DatabaseConnection.connect();
    const response = await ControllerFactory.feedback(conn).getFeedback(user);
    return response.feedback;
  }

  public static async submitFeedback(feedback: Feedback, user: UserModel): Promise<PublicFeedback> {
    const conn = await DatabaseConnection.connect();
    const response = await ControllerFactory.feedback(conn).submitFeedback({ feedback }, user);
    const submittedFeedback = response.feedback;
    return submittedFeedback;
  }
}
