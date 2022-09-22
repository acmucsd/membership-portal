import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { NotFoundError } from 'routing-controllers';
import { UserError } from '../utils/Errors';
import { UserSocialMediaUrlsModel } from '../models/UserSocialMediaUrlsModel';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';
import { Uuid, PublicUserSocialMediaUrl, SocialMediaUrl } from '../types';

@Service()
export default class UserSocialMediaUrlService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getSocialMediaUrlsForUser(user: UserModel): Promise<PublicUserSocialMediaUrl[]> {
    const userSocialMediaUrl = await this.transactions.readOnly(async (txn) => {
      const userSocialMediaUrlRepository = Repositories.userSocialMediaUrl(txn);
      return userSocialMediaUrlRepository.getSocialMediaUrlsForUser(user);
    });
    return userSocialMediaUrl.map((fb) => fb.getPublicSocialMediaUrl());
  }

  public async insertSocialMediaUrlForUser(user: UserModel, socialMediaUrl: SocialMediaUrl) {
    const addedSocialMediaUrl = await this.transactions.readWrite(async (txn) => {
      await Repositories.userSocialMediaUrl(txn);
      const isNewSocialMediaType = await Repositories.userSocialMediaUrl(txn)
        .isNewSocialMediaTypeForUser(user, socialMediaUrl.socialMediaType);
      if (!isNewSocialMediaType) throw new UserError('Social media URL of this type has been created for this user');
      return Repositories.userSocialMediaUrl(txn)
        .upsertSocialMediaUrl(UserSocialMediaUrlsModel.create({ ...socialMediaUrl, user }));
    });
    return addedSocialMediaUrl.getPublicSocialMediaUrl();
  }

  public async updateSocialMediaUrlByUuid(uuid: Uuid, url: string): Promise<PublicUserSocialMediaUrl> {
    const updatedSocialMediaUrl = await this.transactions.readWrite(async (txn) => {
      const userSocialMediaUrlRepository = Repositories.userSocialMediaUrl(txn);
      const socialMediaUrl = await userSocialMediaUrlRepository.findByUuid(uuid);
      if (!socialMediaUrl) throw new NotFoundError('Social media URL not found');

      return userSocialMediaUrlRepository.upsertSocialMediaUrl(socialMediaUrl, { url });
    });
    return updatedSocialMediaUrl.getPublicSocialMediaUrl();
  }
}
