import * as faker from 'faker';
import { Feedback, FeedbackType } from '@acmucsd/membership-portal-types';
import FactoryUtils from './FactoryUtils';

export class FeedbackFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, FeedbackFactory.fake);
  }

  public static fake(substitute?: Partial<Feedback>): Feedback {
    const fake = {
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.words(100),
      type: FeedbackFactory.randomFeedbackType(),
    };
    return {
      ...fake,
      ...substitute,
    };
  }

  private static randomFeedbackType(): FeedbackType {
    return FactoryUtils.pickRandomValue(Object.values(FeedbackType));
  }
}
