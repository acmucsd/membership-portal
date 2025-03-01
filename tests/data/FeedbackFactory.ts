import { faker } from '@faker-js/faker';
import { v4 as uuid } from 'uuid';
import { FeedbackStatus, FeedbackType } from '../../types';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';
import { EventFactory } from './EventFactory';
import { FeedbackModel } from '../../models/FeedbackModel';
import { FeedbackRepository } from '../../repositories';

export class FeedbackFactory {
  public static create(n: number): FeedbackModel[] {
    return FactoryUtils.create(n, FeedbackFactory.fake);
  }

  public static fake(substitute?: Partial<FeedbackModel>): FeedbackModel {
    const fake = FeedbackRepository.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      event: EventFactory.fake(),
      source: FactoryUtils.pickRandomValue(['Discord', 'Instagram', 'Portal']),
      timestamp: new Date(),
      description: faker.lorem.words(100),
      status: FeedbackStatus.SUBMITTED,
      type: FeedbackFactory.randomFeedbackType(),
    });
    return FeedbackRepository.merge(fake, substitute);
  }

  private static randomFeedbackType(): FeedbackType {
    return FactoryUtils.pickRandomValue(Object.values(FeedbackType));
  }
}
