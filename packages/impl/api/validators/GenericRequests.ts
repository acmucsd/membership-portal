import { Min, IsEmail, IsUUID, IsHexadecimal, Length } from 'class-validator';
import { Pagination as IPagination, Uuid } from '@acmucsd/membership-portal-types';

export class Pagination implements IPagination {
  @Min(0)
  offset?: number;

  @Min(0)
  limit?: number;
}

export class EmailParam {
  @IsEmail()
  email: string;
}
export class UuidParam {
  @IsUUID()
  uuid: Uuid;
}

export class AccessCodeParam {
  @IsHexadecimal()
  @Length(32, 32)
  accessCode: string;
}
