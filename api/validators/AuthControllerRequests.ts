import { IsEmail, IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsValidPassword, IsValidName, IsValidGraduationYear, IsValidMajor, HasMatchingPasswords,
} from '../decorators/Validators';
import {
  LoginRequest as ILoginRequest,
  RegistrationRequest as IRegistrationRequest,
  PasswordResetRequest as IPasswordResetRequest,
} from '../../types';

export class PasswordChange {
  @IsDefined()
  @IsValidPassword()
  newPassword: string;

  @IsDefined()
  confirmPassword: string;
}

export class RegistrationRequest implements IRegistrationRequest {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  @IsValidName()
  firstName: string;

  @IsDefined()
  @IsValidName()
  lastName: string;

  @IsDefined()
  @IsValidPassword()
  password: string;

  @IsDefined()
  @IsValidGraduationYear()
  graduationYear: number;

  @IsDefined()
  @IsValidMajor()
  major: string;
}

export class LoginRequest implements ILoginRequest {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

export class PasswordResetRequest implements IPasswordResetRequest {
  // manually annotate nested type for class-transsformer
  // bc TypeScript lacks proper reflection
  @Type(() => PasswordChange)
  @IsDefined()
  @ValidateNested()
  @HasMatchingPasswords()
  user: PasswordChange;
}
