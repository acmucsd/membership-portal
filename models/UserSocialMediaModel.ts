import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { UserModel } from './UserModel';
import { Uuid, SocialMediaType, PublicUserSocialMedia } from '../types';

@Entity('UserSocialMedias')
export class UserSocialMediaModel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid: Uuid;

  @ManyToOne((type) => UserModel, (user) => user.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user' })
  @Index({ unique: true })
  user: UserModel;

  @Column('varchar', { length: 255 })
  type: SocialMediaType;

  @Column('varchar', { length: 255 })
  url: string;

  public getPublicSocialMedia(): PublicUserSocialMedia {
    return {
      uuid: this.uuid,
      user: this.user,
      type: this.type,
      url: this.url,
    };
  }
}
