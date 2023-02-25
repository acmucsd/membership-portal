import { ForbiddenError, NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { EntityManager } from 'typeorm';
import { InjectManager } from 'typeorm-typedi-extensions';
import { ActivityType, ResumePatches } from '../types';
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
      .resume(txn)
      .findVisibleResumes());
    return resumes;
  }

  public async updateResume(user: UserModel, resumeURL: string, isResumeVisible: boolean): Promise<ResumeModel> {
    return this.transactions.readWrite(async (txn) => {
      const resumeRepository = Repositories.resume(txn);
      const oldResume = await resumeRepository.findByUserUuid(user.uuid);
      if (oldResume) await resumeRepository.deleteResume(oldResume);

      const resume = await resumeRepository.upsertResume(ResumeModel.create({
        user,
        isResumeVisible,
        url: resumeURL,
      }));

      await Repositories.activity(txn).logActivity({
        type: ActivityType.RESUME_UPLOAD,
        user,
      });

      return resume;
    });
  }

  public async patchResume(uuid: string, patches: ResumePatches, user: UserModel) {
    return this.transactions.readWrite(async (txn) => {
      const resumeRepository = Repositories.resume(txn);
      const resume = await resumeRepository.findByUuid(uuid);

      if (resume.user.uuid !== user.uuid) {
        throw new ForbiddenError('Cannot update a resume of another user');
      }

      return resumeRepository.upsertResume(resume, patches);
    });
  }

  public async getUserResume(user: UserModel): Promise<ResumeModel> {
    return this.transactions.readWrite(async (txn) => Repositories
      .resume(txn)
      .findByUserUuid(user.uuid));
  }

  public async deleteResume(uuid: string, user: UserModel): Promise<ResumeModel> {
    return this.transactions.readWrite(async (txn) => {
      const resumeRepository = Repositories.resume(txn);
      const resume = await resumeRepository.findByUuid(uuid);
      if (!resume) throw new NotFoundError('Cannot find a resume of given uuid');
      if (resume.user.uuid !== user.uuid) throw new ForbiddenError('Cannot delete a resume of another user');
      await resumeRepository.deleteResume(resume);
      return resume;
    });
  }
}
