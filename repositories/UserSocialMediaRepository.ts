import { DataSource } from 'typeorm';
import Container from 'typedi';
import { SocialMediaType, Uuid } from 'types';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';

export const UserSocialMediaRepository = Container.get(DataSource)
  .getRepository(UserSocialMediaModel)
  .extend({
    async getSocialMediaForUser(user: UserModel): Promise<UserSocialMediaModel[]> {
      return this.getBaseFindQuery().where({ user }).getMany();
    },

    async findByUuid(uuid: Uuid): Promise<UserSocialMediaModel> {
      return this.getBaseFindQuery()
        .leftJoinAndSelect('userSocialMedia.user', 'user')
        .where({ uuid }).getOne();
    },

    async upsertSocialMedia(userSocialMedia: UserSocialMediaModel,
      changes?: Partial<UserSocialMediaModel>): Promise<UserSocialMediaModel> {
      if (changes) userSocialMedia = this.repository.merge(userSocialMedia, changes) as UserSocialMediaModel;
      return this.repository.save(userSocialMedia);
    },

    async deleteSocialMedia(userSocialMedia: UserSocialMediaModel): Promise<UserSocialMediaModel> {
      return this.repository.remove(userSocialMedia);
    },

    async isNewSocialMediaTypeForUser(user: UserModel, type: SocialMediaType): Promise<boolean> {
      const socialMedia = await this.getBaseFindQuery().where({ user, type }).getMany();
      return socialMedia.length === 0;
    },

    getBaseFindQuery() {
      return this.repository.createQueryBuilder('userSocialMedia');
    },
  });
