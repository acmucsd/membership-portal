import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PrivateProfile, PublicProfile, Uuid, UserAccessType, UserState } from '../types';
import { ActivityModel } from './ActivityModel';
import { AttendanceModel } from './AttendanceModel';
import { OrderModel } from './OrderModel';
import { FeedbackModel } from './FeedbackModel';
import { ResumeModel } from './ResumeModel';
import { UserSocialMediaModel } from './UserSocialMediaModel';

@Entity('Users')
export class UserModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @Column('varchar', { length: 255, nullable: false })
  @Index({ unique: true })
  handle: string;

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

  @Column('boolean', { default: true })
  isAttendancePublic: boolean;

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

  @OneToMany((type) => ResumeModel, (resume) => resume.user, { cascade: true })
  resumes: ResumeModel[];

  @OneToMany((type) => UserSocialMediaModel, (userSocialMedia) => userSocialMedia.user, { cascade: true })
  userSocialMedia: UserSocialMediaModel[];

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

  public hasStoreDistributorPermissions(): boolean {
    return this.isAdmin() || this.isMerchStoreManager() || this.isMerchStoreDistributor();
  }

  public isMarketing(): boolean {
    return this.accessType === UserAccessType.MARKETING;
  }

  public isMerchStoreManager(): boolean {
    return this.accessType === UserAccessType.MERCH_STORE_MANAGER;
  }

  public isMerchStoreDistributor(): boolean {
    return this.accessType === UserAccessType.MERCH_STORE_DISTRIBUTOR;
  }

  public getPublicProfile(): PublicProfile {
    const publicProfile: PublicProfile = {
      uuid: this.uuid,
      handle: this.handle,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePicture: this.profilePicture,
      graduationYear: this.graduationYear,
      major: this.major,
      bio: this.bio,
      points: this.points,
      isAttendancePublic: this.isAttendancePublic,
    };
    if (this.userSocialMedia) {
      publicProfile.userSocialMedia = this.userSocialMedia.map((sm) => sm.getPublicSocialMedia());
    }
    return publicProfile;
  }

  public getFullUserProfile(): PrivateProfile {
    const fullUserProfile: PrivateProfile = {
      uuid: this.uuid,
      handle: this.handle,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePicture: this.profilePicture,
      accessType: this.accessType,
      state: this.state,
      graduationYear: this.graduationYear,
      major: this.major,
      bio: this.bio,
      points: this.points,
      credits: this.credits,
      isAttendancePublic: this.isAttendancePublic,
    };
    if (this.userSocialMedia) {
      fullUserProfile.userSocialMedia = this.userSocialMedia.map((sm) => sm.getPublicSocialMedia());
    }
    return fullUserProfile;
  }
}
