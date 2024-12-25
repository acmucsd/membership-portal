import { DataSource } from 'typeorm';
import Container from 'typedi';
import { ResumeModel } from '../models/ResumeModel';
import { UserModel } from '../models/UserModel';

export const ResumeRepository = Container.get(DataSource)
  .getRepository(ResumeModel)
  .extend({
    async findVisibleResumes(): Promise<ResumeModel[]> {
      return this.repository.find({
        relations: ['user'],
        where: {
          isResumeVisible: true,
        },
      });
    },

    async findAllByUser(user: UserModel): Promise<ResumeModel[]> {
      return this.repository.find({ user });
    },

    async deleteResume(resume: ResumeModel) : Promise<ResumeModel> {
      return this.repository.remove(resume);
    },

    async findByUuid(uuid: string): Promise<ResumeModel> {
      return this.repository.findOne({ uuid }, { relations: ['user'] });
    },

    async findByUserUuid(user: string): Promise<ResumeModel> {
      const resume = await this.repository.findOne({
        where: {
          user: {
            uuid: user,
          },
        },
      });

      return resume;
    },

    async upsertResume(resume: ResumeModel, changes?: Partial<ResumeModel>): Promise<ResumeModel> {
      if (changes) resume = this.repository.merge(resume, changes) as ResumeModel;
      return this.repository.save(resume);
    },
  });
