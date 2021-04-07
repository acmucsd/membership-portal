import { request } from './index';
import {IsEmpty, IsNotEmpty, IsDefined, ValidateNested, Validate} from 'class-validator';
import { UserModel } from '../../models/UserModel';
import { ValidUuid, ValidEmail, ValidAccessCode } from '../../types/ApiParams';
import {
    EventSearchOptions,
    PatchEventRequest,
    CreateEventRequest,
    SubmitEventFeedbackRequest,
  } from '../validators/EventControllerRequests';


export class GetPastEventsRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsEmpty()
    body?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    queryParam?:EventSearchOptions;

    @IsEmpty()
    query?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class GetFutureEventsRequestParam implements request{
    @IsEmpty()
    param?:any;

    @IsEmpty()
    body?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    queryParam?:EventSearchOptions;

    @IsEmpty()
    query?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class UpdateEventCoverRequestParam implements request{
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
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class SubmitEventFeedbackRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidUuid;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:SubmitEventFeedbackRequest;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class GetOneEventRequestParam implements request{
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
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class UpdateEventRequestParam implements request{
    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    param?:ValidUuid;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    body?:PatchEventRequest;

    @IsEmpty()
    queryParam?:any;

    @IsEmpty()
    query?:any;

    @IsNotEmpty()
    @IsDefined()
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}

export class DeleteEventRequestParam implements request{
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
    @ValidateNested()
    authenticatedUser?:UserModel;
    
    @IsEmpty()
    requestTrace?:any;
}