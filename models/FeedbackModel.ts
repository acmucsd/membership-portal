import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FeedbackType, PublicFeedback, Uuid } from '../types';
import { UserModel } from './UserModel';

@Entity('Feedback')
export class FeedbackModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  @Index('user_feedback_by_user_index')
  user: UserModel;

  @Column('varchar')
  title: string;

  @Column('text')
  description: string;

  @Column('timestamptz', { default: 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column({ default: false })
  acknowledged: boolean;

  @Column('varchar')
  type: FeedbackType;

  public getPublicFeedback(): PublicFeedback {
    return {
      uuid: this.uuid,
      user: this.user.getPublicProfile(),
      title: this.title,
      description: this.description,
      timestamp: this.timestamp,
      acknowledged: this.acknowledged,
      type: this.type,
    };
  }
}
