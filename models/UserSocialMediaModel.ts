import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { UserModel } from '.';
import { Uuid, SocialMediaType, PublicUserSocialMedia } from '../types';

@Entity('UserSocialMedia')
export class UserSocialMediaModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.userSocialMedia, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  user: UserModel;

  @Column('varchar', { length: 255 })
  type: SocialMediaType;

  @Column('varchar', { length: 255 })
  url: string;

  public getPublicSocialMedia(): PublicUserSocialMedia {
    const publicSocialMedia: PublicUserSocialMedia = {
      uuid: this.uuid,
      type: this.type,
      url: this.url,
    };
    if (this.user) publicSocialMedia.user = this.user.getPublicProfile();
    return publicSocialMedia;
  }
}
