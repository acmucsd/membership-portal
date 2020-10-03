import {
  ValidatorConstraint, ValidatorConstraintInterface, registerDecorator, ValidationOptions,
} from 'class-validator';
import { PasswordChange } from '../../types';

function templatedValidationDecorator(
  validator: ValidatorConstraintInterface | Function, validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator,
    });
  };
}

@ValidatorConstraint()
class GraduationYearValidator implements ValidatorConstraintInterface {
  validate(graduationYear: number): boolean {
    const currentYear = new Date().getFullYear();
    return graduationYear >= currentYear && graduationYear <= currentYear + 6;
  }

  defaultMessage(): string {
    return 'Your graduation year must be within the next 6 years';
  }
}

export function IsValidGraduationYear(validationOptions?: ValidationOptions) {
  return templatedValidationDecorator(GraduationYearValidator, validationOptions);
}

@ValidatorConstraint()
class NameValidator implements ValidatorConstraintInterface {
  validate(name: string): boolean {
    return name.length > 0;
  }

  defaultMessage(): string {
    return 'Your name cannot be empty';
  }
}

export function IsValidName(validationOptions?: ValidationOptions) {
  return templatedValidationDecorator(NameValidator, validationOptions);
}

@ValidatorConstraint()
class PasswordValidator implements ValidatorConstraintInterface {
  private MIN_LENGTH = 8;

  validate(password: string): boolean {
    return password.length > this.MIN_LENGTH;
  }

  defaultMessage(): string {
    return `Your password must be longer than ${this.MIN_LENGTH} characters`;
  }
}

export function IsValidPassword(validationOptions?: ValidationOptions) {
  return templatedValidationDecorator(PasswordValidator, validationOptions);
}

@ValidatorConstraint()
class MajorValidator implements ValidatorConstraintInterface {
  validate(major: string): boolean {
    return major.length >= 2;
  }

  defaultMessage(): string {
    return 'Your major must be at least 2 characters';
  }
}

export function IsValidMajor(validationOptions?: ValidationOptions) {
  return templatedValidationDecorator(MajorValidator, validationOptions);
}

@ValidatorConstraint()
class MatchingPasswordsValidator implements ValidatorConstraintInterface {
  validate(passwordChange: PasswordChange): boolean {
    return passwordChange.newPassword === passwordChange.confirmPassword;
  }

  defaultMessage(): string {
    return 'Passwords do not match';
  }
}

export function HasMatchingPasswords(validationOptions?: ValidationOptions) {
  return templatedValidationDecorator(MatchingPasswordsValidator, validationOptions);
}
