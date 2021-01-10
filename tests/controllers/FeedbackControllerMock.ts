import { Connection } from 'typeorm';
import { UserModel } from '../../models/UserModel';
import { DatabaseConnection, PortalState } from '../data';
import { PublicFeedback, Feedback, Uuid, FeedbackStatus } from '../../types';
import { ControllerFactory } from './ControllerFactory';

export class FeedbackControllerMock {
  private static conn: Connection;

  public static async mock(users: UserModel[]): Promise<void> {
    this.conn = await DatabaseConnection.connect();
    const state = new PortalState().createUsers(users);
    await state.write(this.conn);
  }

  public static async getFeedback(user: UserModel): Promise<PublicFeedback[]> {
    const response = await ControllerFactory.feedback(this.conn).getFeedback(user);
    return response.feedback;
  }

  public static async submitFeedback(feedback: Feedback, user: UserModel): Promise<PublicFeedback> {
    const response = await ControllerFactory.feedback(this.conn).submitFeedback({ feedback }, user);
    return response.feedback;
  }

  public static async acknowledgeFeedback(uuid: Uuid, user: UserModel): Promise<PublicFeedback> {
    const status = FeedbackStatus.ACKNOWLEDGED;
    const response = await ControllerFactory
      .feedback(this.conn)
      .updateFeedbackStatus(uuid, { status }, user);
    return response.feedback;
  }

  public static async ignoreFeedback(uuid: Uuid, user: UserModel): Promise<PublicFeedback> {
    const status = FeedbackStatus.IGNORED;
    const response = await ControllerFactory
      .feedback(this.conn)
      .updateFeedbackStatus(uuid, { status }, user);
    return response.feedback;
  }
}
