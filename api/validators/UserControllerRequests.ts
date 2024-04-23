import {
  ValidateNested,
  IsDefined,
  Allow,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PasswordUpdate as IPasswordUpdate,
  PatchUserRequest as IPatchUserRequest,
  UserPatches as IUserPatches,
} from '@customtypes';
import {
  IsValidName,
  IsValidMajor,
  IsValidGraduationYear,
  HasMatchingPasswords,
  IsValidHandle,
} from '@decorators';
import { PasswordChange } from '@validators';

export class PasswordUpdate extends PasswordChange implements IPasswordUpdate {
  @IsDefined()
  password: string;
}

export class UserPatches implements IUserPatches {
  @IsValidName()
  firstName?: string;

  @IsValidHandle()
  @Length(3, 32)
  handle?: string;

  @IsValidName()
  lastName?: string;

  @IsValidMajor()
  major?: string;

  @IsValidGraduationYear()
  graduationYear?: number;

  @Allow()
  bio?: string;

  @Allow()
  isAttendancePublic?: boolean;

  @Type(() => PasswordUpdate)
  @ValidateNested()
  @HasMatchingPasswords()
  passwordChange?: PasswordUpdate;
}

export class PatchUserRequest implements IPatchUserRequest {
  @Type(() => UserPatches)
  @ValidateNested()
  @IsDefined()
  user: UserPatches;
}
