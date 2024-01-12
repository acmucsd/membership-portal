import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { IsValidSocialMediaType } from '../decorators/Validators';
import {
  InsertUserSocialMediaRequest as IInsertUserSocialMediaRequest,
  UpdateUserSocialMediaRequest as IUpdateUserSocialMediaRequest,
  SocialMedia as ISocialMedia,
  SocialMediaPatches as ISocialMediaPatches,
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

export class SocialMediaPatches implements ISocialMediaPatches {
  @IsNotEmpty()
  url: string;

  @IsNotEmpty()
  @IsUUID()
  uuid: string;
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
