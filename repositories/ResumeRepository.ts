import { EntityRepository } from 'typeorm';
import { ResumeModel } from '../models/ResumeModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ResumeModel)
export class ResumeRepository extends BaseRepository<ResumeModel> {
  public async deleteResume(resume: ResumeModel) : Promise<ResumeModel> {
    return this.repository.remove(resume);
  }

  public async findByUserUuid(uuid: string): Promise<ResumeModel> {
    const resume = await this.repository.findOne({
      where: {
        user: {
          uuid,
        },
      },
    });

    return resume;
  }

  public async upsertResume(resume: ResumeModel, changes?: Partial<ResumeModel>): Promise<ResumeModel> {
    if (changes) resume = ResumeModel.merge(resume, changes);
    return this.repository.save(resume);
  }
}
