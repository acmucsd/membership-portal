import { EntityRepository } from 'typeorm';
import { ResumeModel } from '../models/ResumeModel';
import { BaseRepository } from './BaseRepository';
import { UserModel } from '../models/UserModel';

@EntityRepository(ResumeModel)
export class ResumeRepository extends BaseRepository<ResumeModel> {
  public async findVisibleResumes(): Promise<ResumeModel[]> {
    return this.repository.find({
      relations: ['user'],
      where: {
        isResumeVisible: true,
      },
    });
  }

  public async findAllByUser(user: UserModel): Promise<ResumeModel[]> {
    return this.repository.find({ user });
  }

  public async deleteResume(resume: ResumeModel) : Promise<ResumeModel> {
    return this.repository.remove(resume);
  }

  public async findByUuid(uuid: string): Promise<ResumeModel> {
    return this.repository.findOne({ uuid }, { relations: ['user'] });
  }

  public async findByUserUuid(user: string): Promise<ResumeModel> {
    const resume = await this.repository.findOne({
      where: {
        user: {
          uuid: user,
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
