import { EntityRepository } from 'typeorm';
import { SocialMediaType, Uuid } from 'types';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(UserSocialMediaModel)
export class UserSocialMediaRepository extends BaseRepository<UserSocialMediaModel> {
  public async getSocialMediaForUser(user: UserModel): Promise<UserSocialMediaModel[]> {
    return this.getBaseFindQuery().where({ user }).getMany();
  }

  public async findByUuid(uuid: Uuid): Promise<UserSocialMediaModel> {
    return this.getBaseFindQuery()
      .leftJoinAndSelect('userSocialMedia.user', 'user')
      .where({ uuid }).getOne();
  }

  public async upsertSocialMedia(userSocialMedia: UserSocialMediaModel,
    changes?: Partial<UserSocialMediaModel>[]): Promise<UserSocialMediaModel> {
    if (changes) for (const change of changes) userSocialMedia = UserSocialMediaModel.merge(userSocialMedia, change);
    return this.repository.save(userSocialMedia);
  }

  public async deleteSocialMedia(userSocialMedia: UserSocialMediaModel[]): Promise<UserSocialMediaModel[]> {
    return this.repository.remove(userSocialMedia);
  }

  public async isNewSocialMediaTypeForUser(user: UserModel, type: SocialMediaType): Promise<boolean> {
    const socialMedia = await this.getBaseFindQuery().where({ user, type }).getMany();
    return socialMedia.length === 0;
  }

  private getBaseFindQuery() {
    return this.repository.createQueryBuilder('userSocialMedia');
  }
}
