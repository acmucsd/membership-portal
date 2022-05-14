import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FeedbackStatus, FeedbackType, PublicFeedback, Uuid } from '@acmucsd/membership-portal-types';
import { UserModel } from './UserModel';

@Entity('Feedback')
export class FeedbackModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  @Index('feedback_by_user_index')
  user: UserModel;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column('timestamptz', { default: 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column('varchar', { length: 255, default: FeedbackStatus.SUBMITTED })
  status: FeedbackStatus;

  @Column('varchar', { length: 255 })
  type: FeedbackType;

  public getPublicFeedback(): PublicFeedback {
    return {
      uuid: this.uuid,
      user: this.user.getPublicProfile(),
      title: this.title,
      description: this.description,
      timestamp: this.timestamp,
      status: this.status,
      type: this.type,
    };
  }
}
