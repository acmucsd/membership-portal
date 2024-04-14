import * as faker from 'faker';
import { v4 as uuid } from 'uuid';
import { UserSocialMediaModel } from '../../models';
import { SocialMediaType } from '../../types';
import { FactoryUtils } from '.';
import { UserFactory } from '.';

export class UserSocialMediaFactory {
  public static create(n: number): UserSocialMediaModel[] {
    return FactoryUtils.create(n, UserSocialMediaFactory.fake);
  }

  public static fake(substitute?: Partial<UserSocialMediaModel>): UserSocialMediaModel {
    const fake = UserSocialMediaModel.create({
      uuid: uuid(),
      user: UserFactory.fake(),
      type: UserSocialMediaFactory.randomSocialMediaType(),
      url: faker.internet.url(),
    });
    return UserSocialMediaModel.merge(fake, substitute);
  }

  private static randomSocialMediaType(): SocialMediaType {
    return FactoryUtils.pickRandomValue(Object.values(SocialMediaType));
  }
}
