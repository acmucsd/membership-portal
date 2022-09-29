import { EntityRepository } from 'typeorm';
import { ResumeModel } from '../models/ResumeModel';
import { BaseRepository } from './BaseRepository';
import { Uuid } from '../types';
import { UserModel } from '../models/UserModel';

@EntityRepository(ResumeModel)
export class ResumeRepository extends BaseRepository<ResumeModel> {
  public async findVisibleResumes(): Promise<ResumeModel[]> {
    return this.repository.find({
      isResumeVisible: true,
    });
  }

  public async findByUuid(uuid: Uuid): Promise<ResumeModel> {
    return this.repository.findOne({ uuid });
  }

  public async findAllByUser(user: UserModel): Promise<ResumeModel[]> {
    return this.repository.find({ user });
  }
}
