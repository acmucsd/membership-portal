import { BaseEntity, Column, Entity, Generated, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { pick } from 'underscore';
import * as bcrypt from 'bcrypt';
import { PrivateProfile, PublicProfile, Uuid, UserAccessType, UserState } from '../types';
import { ActivityModel } from './ActivityModel';
import { AttendanceModel } from './AttendanceModel';
import { OrderModel } from './OrderModel';

@Entity('Users')
export class UserModel extends BaseEntity {
  @Column()
  @Generated('increment')
  id: number;

  @PrimaryGeneratedColumn('uuid')
  @Index({ unique: true })
  uuid: Uuid;

  @Column()
  @Index({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  hash: string;

  @Column({ nullable: true })
  profilePicture: string;

  @Column({
    type: 'enum',
    enum: UserAccessType,
    default: UserAccessType.STANDARD,
  })
  accessType: UserAccessType;

  @Column({
    type: 'enum',
    enum: UserState,
    default: UserState.PENDING,
  })
  state: UserState;

  @Column({ nullable: true })
  @Index({ unique: true })
  accessCode: string;

  @Column()
  graduationYear: number;

  @Column()
  major: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string;

  @Column({ default: 0 })
  @Index('leaderboard_index')
  points: number;

  @Column({ default: 0 })
  credits: number;

  @Column('timestamptz', { default: () => 'CURRENT_TIMESTAMP(6)' })
  lastLogin: Date;

  @OneToMany((type) => ActivityModel, (activity) => activity.user, { cascade: true })
  activities: ActivityModel[];

  @OneToMany((type) => AttendanceModel, (attendance) => attendance.user, { cascade: true })
  attendances: AttendanceModel[];

  @OneToMany((type) => OrderModel, (order) => order.user, { cascade: true })
  orders: OrderModel[];

  public isBlocked(): boolean {
    return this.state === UserState.BLOCKED;
  }

  public async verifyPass(pass: string): Promise<boolean> {
    return bcrypt.compare(pass, this.hash);
  }

  public markAsVerified(): Promise<UserModel> {
    this.state = UserState.ACTIVE;
    return this.save();
  }

  public hasEnoughCredits(credits: number): boolean {
    return this.credits >= credits;
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
