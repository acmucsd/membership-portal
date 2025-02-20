import { faker } from '@faker-js/faker';
import { v4 as uuid } from 'uuid';
import { ResumeModel } from '../../models/ResumeModel';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';
import { ResumeRepository } from '../../repositories';

export class ResumeFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, ResumeFactory.fake);
  }

  public static fake(substitute?: Partial<ResumeModel>): ResumeModel {
    const fake = ResumeRepository.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      isResumeVisible: false,
      url: faker.internet.url(),
      lastUpdated: new Date(),
    });
    return ResumeRepository.merge(fake, substitute);
  }
}
