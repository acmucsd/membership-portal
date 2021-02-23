import { IsEmail, IsUUID } from 'class-validator';
import { Uuid } from '.';

export class ValidEmail{
    @IsEmail()
    email:string;
}
export class ValidUuid{
    @IsUUID()
    uuid:Uuid;
}