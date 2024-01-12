import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { UserError } from '../utils/Errors';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { Uuid, SocialMedia, TestPublicUserSocialMedia } from '../types';

@Service()
export default class UserSocialMediaService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getSocialMediaForUser(user: UserModel): Promise<UserSocialMediaModel[]> {
    const userSocialMedia = await this.transactions.readOnly(async (txn) => Repositories.userSocialMedia(txn)
      .getSocialMediaForUser(user));
    return userSocialMedia;
  }

  public async insertSocialMediaForUser(user: UserModel, socialMedia: SocialMedia[]): Promise<UserSocialMediaModel[]> {
    return this.transactions.readWrite(async (txn) => {

      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const addedSocialMedia = await Promise.all(socialMedia.map(async (userSocialMedia) => {

        const { type } = userSocialMedia;

        const isNewSocialMediaType = await userSocialMediaRepository.isNewSocialMediaTypeForUser(user, type);
        if (!isNewSocialMediaType) {
          throw new UserError('Social media URL of this type has already been created for this user');
        }

        const newSocialMedia = await userSocialMediaRepository.upsertSocialMedia(UserSocialMediaModel.create({ ...userSocialMedia, user }));

        return newSocialMedia;
      }));

      return addedSocialMedia;
    });
  }

  public async updateSocialMediaByUuid(user: UserModel,
    changes: Partial<UserSocialMediaModel>[]): Promise<UserSocialMediaModel[]> {
      return this.transactions.readWrite(async (txn) => {
        const userSocialMediaRepository = Repositories.userSocialMedia(txn);
        const updatedSocialMedia = await Promise.all(changes.map(async (userSocialMedia) => {

          const { uuid, url } = userSocialMedia;
          const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
          if (!socialMedia) throw new NotFoundError('Social media URL not found');

          if (user.uuid !== socialMedia.user.uuid) {
            throw new ForbiddenError('User cannot update a social media URL of another user');
          }

          const newSocialMedia = await userSocialMediaRepository.upsertSocialMedia(UserSocialMediaModel.create({ ...userSocialMedia, user }));

          return newSocialMedia;
        }));

        return updatedSocialMedia;
      });
  }

  public async deleteSocialMediaByUuid(user: UserModel, uuid: Uuid): Promise<UserSocialMediaModel> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
      if (!socialMedia) throw new NotFoundError('Social media URL not found');
      if (user.uuid !== socialMedia.user.uuid) {
        throw new ForbiddenError('User cannot delete a social media URL of another user');
      }
      return userSocialMediaRepository.deleteSocialMedia(socialMedia);
    });
    return updatedSocialMedia;
  }
}
