import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, ValidateNested } from 'class-validator';
import { IsValidSocialMediaUrlType } from '../decorators/Validators';
import {
  InsertUserSocialMediaUrlRequest as IInsertUserSocialMediaUrlRequest,
  UpdateUserSocialMediaUrlRequest as IUpdateUserSocialMediaUrlRequest,
  SocialMediaUrl as ISocialMediaUrl,
  SocialMediaType,
} from '../../types';

export class SocialMediaUrl implements ISocialMediaUrl {
  @IsDefined()
  @IsValidSocialMediaUrlType()
  socialMediaType: SocialMediaType;

  @IsDefined()
  @IsNotEmpty()
  url: string;
}

export class InsertSocialMediaUrlRequest implements IInsertUserSocialMediaUrlRequest {
  @Type(() => SocialMediaUrl)
  @ValidateNested()
  @IsDefined()
  socialMediaUrl: SocialMediaUrl;
}

export class UpdateSocialMediaUrlRequest implements IUpdateUserSocialMediaUrlRequest {
  @IsDefined()
  @IsNotEmpty()
  url: string;
}
