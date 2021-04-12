import { Min, IsEmail, IsUUID, IsHexadecimal, Length } from 'class-validator';
import { Pagination as IPagination, Uuid } from '../../types';

export class Pagination implements IPagination {
  @Min(0)
  offset?: number;

  @Min(0)
  limit?: number;
}

export class ValidEmail {
  @IsEmail()
  email:string;
}
export class ValidUuid {
  @IsUUID()
  uuid:Uuid;
}

export class ValidAccessCode {
  @IsHexadecimal()
  @Length(32, 32)
  accessCode:string;
}
