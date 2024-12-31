import { DataSource } from 'typeorm';
import Container from 'typedi';
import { ResumeModel } from '../models/ResumeModel';
import { UserModel } from '../models/UserModel';

export const ResumeRepository = Container.get(DataSource)
  .getRepository(ResumeModel)
  .extend({
    async findVisibleResumes(): Promise<ResumeModel[]> {
      return this.find({
        relations: ['user'],
        where: {
          isResumeVisible: true,
        },
      });
    },

    async findAllByUser(user: UserModel): Promise<ResumeModel[]> {
      return this.find({ where: { user } });
    },

    async deleteResume(resume: ResumeModel) : Promise<ResumeModel> {
      return this.remove(resume);
    },

    async findByUuid(uuid: string): Promise<ResumeModel> {
      return this.findOne({ where: { uuid }, relations: ['user'] });
    },

    async findByUserUuid(user: string): Promise<ResumeModel> {
      const resume = await this.findOne({
        where: {
          user: {
            uuid: user,
          },
        },
      });

      return resume;
    },

    async upsertResume(resume: ResumeModel, changes?: Partial<ResumeModel>): Promise<ResumeModel> {
      if (changes) resume = this.merge(resume, changes) as ResumeModel;
      return this.save(resume);
    },
  });
