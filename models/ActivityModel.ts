import { Entity, BaseEntity, Column, Generated, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { pick } from 'underscore';
import { ActivityType, PublicActivity, Uuid } from '../types';
import { UserModel } from './UserModel';

@Entity('Activities')
export class ActivityModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.activities, { nullable: false })
  @JoinColumn({ name: 'user' })
  @Index('public_activities_by_user_index', { where: 'public IS true' })
  user: UserModel;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  type: ActivityType;

  @Column('text', { nullable: true })
  description: string;

  @Column({ default: 0 })
  pointsEarned: number;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column()
  public: boolean;

  public getPublicActivity(): PublicActivity {
    return pick(this, [
      'type',
      'description',
      'pointsEarned',
      'timestamp',
    ]);
  }
}
