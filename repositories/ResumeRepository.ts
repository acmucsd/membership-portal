import { EntityRepository } from 'typeorm';
import { ResumeModel } from '../models/ResumeModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ResumeModel)
export class ResumeRepository extends BaseRepository<ResumeModel> {
  public async deleteResumes(resumes: ResumeModel[]) : Promise<ResumeModel[]> {
    return this.repository.remove(resumes);
  }

  public async findAllByUserUuid(uuid: string): Promise<ResumeModel[]> {
    return this.repository.find({
      where: {
        user: {
          uuid,
        },
      },
    });
  }

  public async upsertResume(resume: ResumeModel, changes?: Partial<ResumeModel>): Promise<ResumeModel> {
    if (changes) resume = ResumeModel.merge(resume, changes);
    return this.repository.save(resume);
  }
}
