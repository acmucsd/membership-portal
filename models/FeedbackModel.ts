import { BaseEntity, Column, Entity, Generated, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PublicFeedback, Uuid } from '../types';
import { UserModel } from './UserModel';

@Entity('Feedback')
export class FeedbackModel extends BaseEntity {
  @Column({ select: false })
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.Feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  @Index('user_feedback_by_user_index')
  user: UserModel;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('timestamptz', { default: 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column({ default: false })
  acknowledged: boolean;

  public getPublicFeedback(): PublicFeedback {
    return {
      uuid: this.uuid,
      user: this.user.uuid,
      title: this.title,
      description: this.description,
      timestamp: this.timestamp,
      acknowledged: this.acknowledged,
    };
  }
}
