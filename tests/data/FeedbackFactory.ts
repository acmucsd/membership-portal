import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { FeedbackStatus, FeedbackType } from '../../types';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';
import { EventFactory } from './EventFactory';
import { FeedbackModel } from '../../models/FeedbackModel';

export class FeedbackFactory {
  public static create(n: number): FeedbackModel[] {
    return FactoryUtils.create(n, FeedbackFactory.fake);
  }

  public static fake(substitute?: Partial<FeedbackModel>): FeedbackModel {
    const fake = FeedbackModel.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      event: EventFactory.fake(),
      source: faker.datatype.hexaDecimal(10),
      timestamp: new Date(),
      description: faker.lorem.words(100),
      status: FeedbackStatus.SUBMITTED,
      type: FeedbackFactory.randomFeedbackType(),
    });
    return FeedbackModel.merge(fake, substitute);
  }

  private static randomFeedbackType(): FeedbackType {
    return FactoryUtils.pickRandomValue(Object.values(FeedbackType));
  }
}
