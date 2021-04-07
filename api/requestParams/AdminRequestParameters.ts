import { request } from './index';
import {IsEmpty, IsNotEmpty, IsDefined, ValidateNested, Validate} from 'class-validator';
import { UserModel } from '../../models/UserModel';
import { ValidUuid } from '../../types/ApiParams';
import { AttendEventRequest } from '../validators/AttendanceControllerRequests';


export class AttendancesForEventRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidUuid;

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

export class AttendancesForUserRequestParam implements request{
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

export class AttendEventRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:AttendEventRequest;

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
