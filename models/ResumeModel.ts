import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Uuid } from '../types';
import { UserModel } from './UserModel';

@Entity('Resumes')
export class ResumeModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.uuid, { nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('resumes_by_user_index')
  user: UserModel;

  @Column('boolean', { default: true, nullable: false })
  isResumeVisible: boolean;

  @Column('varchar', { length: 255, nullable: false })
  url: string;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)', nullable: false })
  lastUpdated: Date;
}
