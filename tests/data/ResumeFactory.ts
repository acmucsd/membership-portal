import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ResumeModel } from '../../models/ResumeModel';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';

export class ResumeFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, ResumeFactory.fake);
  }

  public static fake(substitute?: Partial<ResumeModel>): ResumeModel {
    const fake = ResumeModel.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      isResumeVisible: false,
      url: faker.internet.url() + '.pdf',
      lastUpdated: new Date(),
    });
    return ResumeModel.merge(fake, substitute);
  }
}
