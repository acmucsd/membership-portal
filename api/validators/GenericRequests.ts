import { Min, IsEmail, IsUUID, IsHexadecimal, Length } from 'class-validator';
import { Pagination as IPagination, Uuid } from '@customtypes';
import { IsValidHandle } from '@decorators';

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

export class UserHandleParam {
  @IsValidHandle()
  @Length(3, 32)
  handle: string;
}

export class AccessCodeParam {
  @IsHexadecimal()
  @Length(32, 32)
  accessCode: string;
}
