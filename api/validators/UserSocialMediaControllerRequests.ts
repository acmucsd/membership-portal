import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, ValidateNested } from 'class-validator';
import {
  InsertUserSocialMediaRequest as IInsertUserSocialMediaRequest,
  UpdateUserSocialMediaRequest as IUpdateUserSocialMediaRequest,
  SocialMedia as ISocialMedia,
  SocialMediaPatches as ISocialMediaPatches,
  SocialMediaType,
} from '@customtypes';
import { IsValidSocialMediaType } from '@decorators';

export class SocialMedia implements ISocialMedia {
  @IsDefined()
  @IsValidSocialMediaType()
  type: SocialMediaType;

  @IsDefined()
  @IsNotEmpty()
  url: string;
}

export class SocialMediaPatches implements ISocialMediaPatches {
  @IsDefined()
  @IsNotEmpty()
  uuid: string;

  @IsDefined()
  @IsNotEmpty()
  url: string;
}

export class InsertSocialMediaRequest implements IInsertUserSocialMediaRequest {
  @Type(() => SocialMedia)
  @ValidateNested()
  @IsDefined()
  socialMedia: SocialMedia[];
}

export class UpdateSocialMediaRequest implements IUpdateUserSocialMediaRequest {
  @Type(() => SocialMediaPatches)
  @ValidateNested()
  @IsDefined()
  socialMedia: SocialMediaPatches[];
}
