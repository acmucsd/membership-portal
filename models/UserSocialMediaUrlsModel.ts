import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { UserModel } from './UserModel';
import { Uuid, SocialMediaType, PublicUserSocialMediaUrl } from '../types';

@Entity('UserSocialMediaUrls')
export class UserSocialMediaUrlsModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  @Index({ unique: true })
  user: UserModel;

  @Column('varchar', { length: 255 })
  socialMediaType: SocialMediaType;

  @Column('varchar', { length: 255 })
  url: string;

  public getPublicSocialMediaUrl(): PublicUserSocialMediaUrl {
    return {
      uuid: this.uuid,
      user: this.user,
      socialMediaType: this.socialMediaType,
      url: this.url,
    };
  }
}
