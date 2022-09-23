import { ResumeModel } from 'models/ResumeModel';
import { EntityRepository } from 'typeorm';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ResumeModel)
export class ResumeRepository extends BaseRepository<ResumeModel> {

}
