import { EntityRepository } from 'typeorm';
import { SocialMediaType, Uuid } from 'types';
import { UserSocialMediaUrlsModel } from '../models/UserSocialMediaUrlsModel';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(UserSocialMediaUrlsModel)
export class UserSocialMediaUrlRepository extends BaseRepository<UserSocialMediaUrlsModel> {
  public async getSocialMediaUrlsForUser(user: UserModel): Promise<UserSocialMediaUrlsModel[]> {
    return this.getBaseFindQuery().where({ user }).getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<UserSocialMediaUrlsModel> {
    return this.getBaseFindQuery().where({ uuid }).getOne();
  }

  public async upsertSocialMediaUrl(userSocialMediaUrl: UserSocialMediaUrlsModel,
    changes?: Partial<UserSocialMediaUrlsModel>): Promise<UserSocialMediaUrlsModel> {
    if (changes) userSocialMediaUrl = UserSocialMediaUrlsModel.merge(userSocialMediaUrl, changes);
    return this.repository.save(userSocialMediaUrl);
  }

  public async isNewSocialMediaTypeForUser(user: UserModel, socialMediaType: SocialMediaType): Promise<boolean> {
    const socialMediaUrls = await this.getSocialMediaUrlsForUser(user);
    let isNewSocialMediaType = true;
    socialMediaUrls.forEach((url) => {
      if (url.socialMediaType === socialMediaType) isNewSocialMediaType = false;
    });
    return isNewSocialMediaType;
  }

  private getBaseFindQuery() {
    return this.repository.createQueryBuilder('userSocialMediaUrl')
      .leftJoinAndSelect('userSocialMediaUrl.user', 'user');
  }
}
