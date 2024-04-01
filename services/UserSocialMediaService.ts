import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { UserError } from '../utils/Errors';
import { UserSocialMediaModel } from '../models/UserSocialMediaModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { Uuid, SocialMedia } from '../types';

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

  public async insertSocialMediasForUser(user: UserModel, socialMedias: SocialMedia[]) {
    const addedSocialMedias = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      for (const socialMedia of socialMedias) {
        const isNewSocialMediaType = await userSocialMediaRepository.isNewSocialMediaTypeForUser(user, socialMedia.type);
        if (!isNewSocialMediaType) {
          throw new UserError('Social media URL of this type has already been created for this user');
        }
      }
      return userSocialMediaRepository.upsertSocialMedia(UserSocialMediaModel.create({ ...socialMedias, user }));
    });
    return addedSocialMedias;
  }

  public async updateSocialMediasByUuid(user: UserModel,
    uuids: Uuid[],
    changes: Partial<UserSocialMediaModel>[]): Promise<UserSocialMediaModel> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const validSocials = [];
      for (const uuid of uuids) {
        const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
        if (!socialMedia) throw new NotFoundError('Social media URL not found');
        if (user.uuid !== socialMedia.user.uuid) {
          throw new ForbiddenError('User cannot update a social media URL of another user');
        }
        validSocials.push(socialMedia);
      }
      return validSocials.map((socialMedia, index) => updatedSocialMedia.upsertSocialMedia(socialMedia, changes[index]));
    });
    return updatedSocialMedia;
  }

  public async deleteSocialMediasByUuid(user: UserModel, uuids: Uuid[]): Promise<UserSocialMediaModel[]> {
    const updatedSocialMedia = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaRepository = Repositories.userSocialMedia(txn);
      const validSocials = [];
      for (const uuid of uuids) {
        const socialMedia = await userSocialMediaRepository.findByUuid(uuid);
        if (!socialMedia) throw new NotFoundError('Social media URL not found');
        if (user.uuid !== socialMedia.user.uuid) {
          throw new ForbiddenError('User cannot delete a social media URL of another user');
        }
        validSocials.push(socialMedia);
      }
      for (const social of validSocials) userSocialMediaRepository.deleteSocialMedia(social);
      return userSocialMediaRepository.getSocialMediaForUser(user);
    });
    return updatedSocialMedia;
  }
}
