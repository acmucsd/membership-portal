import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { UserSocialMediaModel } from '../../models/UserSocialMediaModel';
import { SocialMediaType } from '../../types';
import FactoryUtils from './FactoryUtils';
import { UserFactory } from './UserFactory';
import { UserSocialMediaRepository } from 'repositories/UserSocialMediaRepository';

export class UserSocialMediaFactory {
  public static create(n: number): UserSocialMediaModel[] {
    return FactoryUtils.create(n, UserSocialMediaFactory.fake);
  }

  public static fake(substitute?: Partial<UserSocialMediaModel>): UserSocialMediaModel {
    const fake = UserSocialMediaRepository.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      type: UserSocialMediaFactory.randomSocialMediaType(),
      url: faker.internet.url(),
    });
    return UserSocialMediaRepository.merge(fake, substitute);
  }

  private static randomSocialMediaType(): SocialMediaType {
    return FactoryUtils.pickRandomValue(Object.values(SocialMediaType));
  }
}
