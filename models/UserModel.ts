import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { pick } from 'underscore';
import * as bcrypt from 'bcrypt';
import { PrivateProfile, PublicProfile, Uuid, UserAccessType, UserState } from '../types';
import { ActivityModel } from './ActivityModel';
import { AttendanceModel } from './AttendanceModel';
import { OrderModel } from './OrderModel';
import { FeedbackModel } from './FeedbackModel';

@Entity('Users')
export class UserModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column()
  @Index({ unique: true })
  email: string;

  @Column('varchar', { length: 255 })
  firstName: string;

  @Column('varchar', { length: 255 })
  lastName: string;

  @Column('varchar', { length: 255 })
  hash: string;

  @Column('varchar', { length: 255, nullable: true })
  profilePicture: string;

  @Column('varchar', { length: 255, default: UserAccessType.STANDARD })
  accessType: UserAccessType;

  @Column('varchar', { length: 255, default: UserState.PENDING })
  state: UserState;

  @Column('varchar', { length: 255, nullable: true })
  @Index({ unique: true })
  accessCode: string;

  @Column('integer')
  graduationYear: number;

  @Column('varchar', { length: 255 })
  major: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string;

  @Column('integer', { default: 0 })
  @Index('leaderboard_index')
  points: number;

  @Column('integer', { default: 0 })
  credits: number;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  lastLogin: Date;

  @OneToMany((type) => ActivityModel, (activity) => activity.user, { cascade: true })
  activities: ActivityModel[];

  @OneToMany((type) => AttendanceModel, (attendance) => attendance.user, { cascade: true })
  attendances: AttendanceModel[];

  @OneToMany((type) => OrderModel, (order) => order.user, { cascade: true })
  orders: OrderModel[];

  @OneToMany((type) => FeedbackModel, (feedback) => feedback.user, { cascade: true })
  feedback: FeedbackModel;

  public async verifyPass(pass: string): Promise<boolean> {
    return bcrypt.compare(pass, this.hash);
  }

  public isBlocked(): boolean {
    return this.state === UserState.BLOCKED;
  }

  public isAdmin(): boolean {
    return this.accessType === UserAccessType.ADMIN;
  }

  public isStaff(): boolean {
    return this.accessType === UserAccessType.STAFF;
  }

  public getPublicProfile(): PublicProfile {
    return pick(this, [
      'uuid',
      'firstName',
      'lastName',
      'profilePicture',
      'graduationYear',
      'major',
      'bio',
      'points',
    ]);
  }

  public getFullUserProfile(): PrivateProfile {
    return pick(this, [
      'uuid',
      'email',
      'firstName',
      'lastName',
      'profilePicture',
      'accessType',
      'state',
      'graduationYear',
      'major',
      'bio',
      'points',
      'credits',
    ]);
  }
}
