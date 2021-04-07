import { request } from './index';
import {IsEmpty, IsNotEmpty, IsDefined, ValidateNested, Validate} from 'class-validator';
import { UserModel } from '../../models/UserModel';
import {
    CreateBonusRequest,
    CreateMilestoneRequest,
    SubmitAttendanceForUserRequest,
} from '../validators/AdminControllerRequests';


export class getAllEmailsRequestParam implements request{
    @IsEmpty()
    param?:any

    @IsEmpty()
    body?:any

    @IsEmpty()
    queryParam?:any

    @IsEmpty()
    query?:any

    @IsNotEmpty()
    @IsDefined()
    authenticatedUser?:UserModel

    @IsEmpty()
    requestTrace?:any;
}

export class createMilestoneRequestParam implements request{
    @IsEmpty()
    param?:any;
    
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:CreateMilestoneRequest;

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

export class CreateBonusRequestParam implements request{
    @IsEmpty()
    param?:any;
    
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:CreateBonusRequest;

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

export class SubmitAttendanceForUserRequestParam implements request{
    @IsEmpty()
    param?:any;
    
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:SubmitAttendanceForUserRequest;

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
