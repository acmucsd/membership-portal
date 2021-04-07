import { IsEmail, IsUUID, IsHexadecimal, Length } from 'class-validator';
import { Uuid } from '.';

export class ValidEmail{
    @IsEmail()
    email:string;
}
export class ValidUuid{
    @IsUUID()
    uuid:Uuid;
}

export class ValidAccessCode{
    @IsHexadecimal()
    @Length(32,32)
    accessCode:string;
}