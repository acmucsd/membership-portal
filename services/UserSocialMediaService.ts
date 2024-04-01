import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { UserError } from '../utils/Errors';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { Uuid, SocialMedia, SocialMediaPatches } from '../types';

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

  public async insertSocialMediaForUser(user: UserModel, socialMedias: SocialMedia[]) {
    const addedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const upsertedSocialMedias = await Promise.all(socialMedias.map(async (socialMedia) => {
        const isNewSocialMediaType = await userSocialMediaRepository.isNewSocialMediaTypeForUser(user, socialMedia.type);
        if (!isNewSocialMediaType) {
          throw new UserError(`Social media URL of type "${socialMedia.type}" has already been created for this user`);
        }
        return userSocialMediaRepository.upsertSocialMedia(UserSocialMediaModel.create({ ...socialMedia, user }));
      }));
      return upsertedSocialMedias;
    });
    return addedSocialMedia;
  }

  public async updateSocialMediaByUuid(user: UserModel,
    changes: SocialMediaPatches[]): Promise<UserSocialMediaModel[]> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const modifiedSocialMedia = await Promise.all(changes.map(async (socialMediaPatches) => {
        const socialMedia = await userSocialMediaRepository.findByUuid(socialMediaPatches.uuid);
        if (!socialMedia) throw new NotFoundError(`Social media of UUID "${socialMediaPatches.uuid}" not found`);
        if (user.uuid !== socialMedia.user.uuid) {
          throw new ForbiddenError('User cannot update a social media URL of another user');
        }
        return userSocialMediaRepository.upsertSocialMedia(socialMedia, { url: socialMediaPatches.url });
      }));
      return modifiedSocialMedia;
    });
    return updatedSocialMedia;
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
