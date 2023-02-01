import * as faker from 'faker';
import { SocialMediaType, SocialMedia } from '../../types';
import FactoryUtils from './FactoryUtils';

export class UserSocialMediaFactory {
  public static create(n: number) {
    return FactoryUtils.create(n, UserSocialMediaFactory.fake);
  }

  public static fake(substitute?: Partial<SocialMedia>): SocialMedia {
    const fake = {
      type: UserSocialMediaFactory.randomSocialMediaType(),
      url: faker.internet.url(),
    };
    return {
      ...fake,
      ...substitute,
    };
  }

  private static randomSocialMediaType(): SocialMediaType {
    return FactoryUtils.pickRandomValue(Object.values(SocialMediaType));
  }
}
