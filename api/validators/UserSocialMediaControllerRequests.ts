import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, ValidateNested } from 'class-validator';
import { IsValidSocialMediaType } from '../decorators/Validators';
import {
  InsertUserSocialMediaRequest as IInsertUserSocialMediaRequest,
  UpdateUserSocialMediaRequest as IUpdateUserSocialMediaRequest,
  SocialMedia as ISocialMedia,
  SocialMediaType,
} from '../../types';

export class SocialMedia implements ISocialMedia {
  @IsDefined()
  @IsValidSocialMediaType()
  type: SocialMediaType;

  @IsDefined()
  @IsNotEmpty()
  url: string;
}

export class InsertSocialMediaRequest implements IInsertUserSocialMediaRequest {
  @Type(() => SocialMedia)
  @ValidateNested()
  @IsDefined()
  socialMedia: SocialMedia;
}

export class UpdateSocialMediaRequest implements IUpdateUserSocialMediaRequest {
  @IsDefined()
  @IsNotEmpty()
  url: string;
}
