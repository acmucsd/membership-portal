import { ValidateNested, IsNotEmpty, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidName, IsValidMajor, IsValidGraduationYear, HasMatchingPasswords } from '../decorators/Validators';
import {
  PasswordUpdate as IPasswordUpdate,
  PatchUserRequest as IPatchUserRequest,
  UserPatches as IUserPatches,
} from '../../types';
import { PasswordChange } from './AuthControllerRequests';

export class PasswordUpdate extends PasswordChange implements IPasswordUpdate {
  @IsDefined()
  password: string;
}

export class UserPatches implements IUserPatches {
  @IsValidName()
  firstName?: string;

  @IsValidName()
  lastName?: string;

  @IsValidMajor()
  major?: string;

  @IsValidGraduationYear()
  graduationYear?: number;

  @IsNotEmpty()
  bio?: string;

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
