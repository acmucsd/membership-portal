import { ValidateNested, IsNotEmpty, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidName, IsValidMajor, IsValidGraduationYear, HasMatchingPasswords } from '../decorators/Validators';
import { PasswordUpdate as IPasswordUpdate, PatchUserRequest as IPatchUserRequest } from '../../types';
import { PasswordChange } from './AuthControllerRequests';

export class PasswordUpdate extends PasswordChange implements IPasswordUpdate {
  @IsDefined()
  password: string;
}

export class PatchUserRequest implements IPatchUserRequest {
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
  @HasMatchingPasswords()
  @ValidateNested()
  passwordChange?: PasswordUpdate;
}
