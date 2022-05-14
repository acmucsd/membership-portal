import { IsEmail, IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsValidPassword, IsValidName, IsValidGraduationYear, IsValidMajor, HasMatchingPasswords,
} from '../decorators/Validators';
import {
  LoginRequest as ILoginRequest,
  RegistrationRequest as IRegistrationRequest,
  PasswordResetRequest as IPasswordResetRequest,
  UserRegistration as IUserRegistration,
  PasswordChange as IPasswordChange,
  EmailModificationRequest as IEmailModificationRequest,
} from '@acmucsd/membership-portal-types';

export class UserRegistration implements IUserRegistration {
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

export class PasswordChange implements IPasswordChange {
  @IsDefined()
  @IsValidPassword()
  newPassword: string;

  @IsDefined()
  confirmPassword: string;
}

export class RegistrationRequest implements IRegistrationRequest {
  @Type(() => UserRegistration)
  @ValidateNested()
  @IsDefined()
  user: UserRegistration;
}

export class LoginRequest implements ILoginRequest {
  @IsDefined()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

export class EmailModificationRequest implements IEmailModificationRequest {
  @IsEmail()
  email: string;
}

export class PasswordResetRequest implements IPasswordResetRequest {
  @Type(() => PasswordChange)
  @IsDefined()
  @ValidateNested()
  @HasMatchingPasswords()
  user: PasswordChange;
}
