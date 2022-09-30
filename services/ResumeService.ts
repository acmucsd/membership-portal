import { ResumeModel } from 'models/ResumeModel';
import { UserModel } from 'models/UserModel';
import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
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

  public async updateUserResumes(user: UserModel) {
    if (!user) throw new NotFoundError('User is null');
    await this.transactions.readWrite(async (txn) => user.updateResumes(Repositories
      .resume(txn))); // not entirely sure readwrite is the one to use here
  }
}
