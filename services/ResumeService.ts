import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ResumeModel } from '../models/ResumeModel';
import { UserModel } from '../models/UserModel';
import { PrivateProfile } from '../types';
import Repositories, { TransactionsManager } from '../repositories';

@Service()
export default class ResumeService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async getVisibleResumes() : Promise<ResumeModel[]> {
    const resumes = await this.transactions.readOnly(async (txn) => Repositories
      .resume(txn).findVisibleResumes());
    if (!resumes) throw new NotFoundError('Resumes was not found');
    return resumes;
  }

  public async getFullUserProfile(user: UserModel) : Promise<PrivateProfile>{
    return this.transactions.readOnly(async (txn) => {
      const userProfile = user.getFullUserProfile();
      userProfile.resumes = await Repositories.resume(txn).findAllByUser(user);
      return userProfile;
    });
  }
}
