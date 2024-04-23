import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { ResumeModel } from '@models';
import { FactoryUtils, UserFactory } from '@tests/data';

export class ResumeFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, ResumeFactory.fake);
  }

  public static fake(substitute?: Partial<ResumeModel>): ResumeModel {
    const fake = ResumeModel.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      isResumeVisible: false,
      url: faker.internet.url(),
      lastUpdated: new Date(),
    });
    return ResumeModel.merge(fake, substitute);
  }
}
