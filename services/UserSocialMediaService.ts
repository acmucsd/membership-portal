import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { UserError } from '../utils/Errors';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { Uuid, PublicUserSocialMedia, SocialMedia } from '../types';

@Service()
export default class UserSocialMediaService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getSocialMediasForUser(user: UserModel): Promise<PublicUserSocialMedia[]> {
    const userSocialMedia = await this.transactions.readOnly(async (txn) => Repositories.userSocialMedia(txn)
      .getSocialMediasForUser(user));
    return userSocialMedia.map((sm) => sm.getPublicSocialMedia());
  }

  public async insertSocialMediaForUser(user: UserModel, socialMedia: SocialMedia) {
    const addedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const isNewSocialMediaType = await userSocialMediaRepository.isNewSocialMediaTypeForUser(user, socialMedia.type);
      if (!isNewSocialMediaType) throw new UserError('Social media URL of this type has been created for this user');
      return userSocialMediaRepository.upsertSocialMedia(UserSocialMediaModel.create({ ...socialMedia, user }));
    });
    return addedSocialMedia.getPublicSocialMedia();
  }

  public async updateSocialMediaByUuid(uuid: Uuid, url: string): Promise<PublicUserSocialMedia> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
      if (!socialMedia) throw new NotFoundError('Social media URL not found');

      return userSocialMediaRepository.upsertSocialMedia(socialMedia, { url });
    });
    return updatedSocialMedia.getPublicSocialMedia();
  }

  public async deleteSocialMediaByUuid(uuid: Uuid): Promise<PublicUserSocialMedia> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
      if (!socialMedia) throw new NotFoundError('Social media URL not found');
      return userSocialMediaRepository.deleteSocialMedia(socialMedia);
    });
    return updatedSocialMedia.getPublicSocialMedia();
  }
}
