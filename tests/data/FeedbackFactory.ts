import * as faker from 'faker';
import { Feedback, FeedbackType } from '../../types';
import FactoryUtils from './FactoryUtils';

export class FeedbackFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, FeedbackFactory.fake);
  }

  public static with(...substitutes: Partial<Feedback>[]): Feedback[] {
    return substitutes.map((sub) => ({ ...FeedbackFactory.fake(), ...sub }));
  }

  public static fake(): Feedback {
    return {
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.words(100),
      type: FeedbackFactory.randomFeedbackType(),
    };
  }

  private static randomFeedbackType(): FeedbackType {
    return FactoryUtils.pickRandomValue(Object.values(FeedbackType));
  }
}
