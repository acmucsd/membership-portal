
import { NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ResumeModel } from '../models/ResumeModel';
import { UserModel } from '../models/UserModel';
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
  
  public async updateResume(user: UserModel, resumeURL: string): Promise<ResumeModel> {
    return this.transactions.readWrite(async (txn) => {
      const resumeRepository = Repositories.resume(txn);
      const oldResume = await resumeRepository.findByUserUuid(user.uuid);
      if (oldResume) await resumeRepository.deleteResume(oldResume);

      return resumeRepository.upsertResume(ResumeModel.create({
        user,
        url: resumeURL,
      }));
    });
  }

  public async getUserResume(user: UserModel): Promise<ResumeModel> {
    return this.transactions.readWrite(async (txn) => Repositories
      .resume(txn)
      .findByUserUuid(user.uuid));
  }
}
