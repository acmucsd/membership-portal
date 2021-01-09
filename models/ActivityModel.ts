import { Entity, BaseEntity, Column, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { pick } from 'underscore';
import { ActivityScope, ActivityType, PublicActivity, Uuid } from '../types';
import { UserModel } from './UserModel';

@Entity('Activities')
@Index('sliding_leaderboard_index', ['timestamp', 'pointsEarned'], { where: '"pointsEarned" > 0' })
@Index('visible_activities_by_user_index', ['user', 'scope'], { where: 'scope = \'PUBLIC\' OR scope = \'PRIVATE\'' })
export class ActivityModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.activities, { nullable: false })
  @JoinColumn({ name: 'user' })
  user: UserModel;

  @Column('varchar', { length: 255 })
  type: ActivityType;

  @Column('text', { nullable: true })
  description: string;

  @Column('integer', { default: 0 })
  pointsEarned: number;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  timestamp: Date;

  @Column('varchar')
  scope: ActivityScope;

  public getPublicActivity(): PublicActivity {
    return pick(this, [
      'type',
      'description',
      'pointsEarned',
      'timestamp',
    ]);
  }
}
