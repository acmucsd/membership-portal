import { request } from './index';
import {IsEmpty, IsNotEmpty, IsDefined, ValidateNested, Validate} from 'class-validator';
import { UserModel } from '../../models/UserModel';
import { ValidEmail, ValidAccessCode } from '../../types/ApiParams';
import { LoginRequest, RegistrationRequest, PasswordResetRequest } from '../validators/AuthControllerRequests';

export class RegistrationRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:RegistrationRequest;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsNotEmpty()
    @IsDefined()
    requestTrace?:string;
}

export class LoginRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:LoginRequest;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsNotEmpty()
    @IsDefined()
    requestTrace?:string;
}

export class ResendEmailVerificationRequest implements Request {
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidEmail;

    @IsEmpty()
    body?:any;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsEmpty()
    requestTrace?:string;
}

export class VerifyEmailRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidAccessCode;

    @IsEmpty()
    body?:any;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsEmpty()
    requestTrace?:any;
}

export class SendPasswordResetEmailRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidEmail;

    @IsEmpty()
    body?:any;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsNotEmpty()
    @IsDefined()
    requestTrace?:string;
}

export class PasswordResetRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidAccessCode;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:PasswordResetRequest;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsEmpty()
    authenticatedUser?:any;
    
    @IsNotEmpty()
    @IsDefined()
    requestTrace?:any;
}

export class VerifyAuthTokenRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsEmpty()
    body?:any;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsNotEmpty()
    @IsDefined()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}
