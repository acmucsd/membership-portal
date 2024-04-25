import { IsDefined, IsNotEmpty, Allow, IsEmail } from 'class-validator';
import {
  AttendEventRequest as IAttendEventRequest,
  AttendViaExpressCheckinRequest as IAttendViaExpressCheckinRequest,
} from '@customtypes';

export class AttendEventRequest implements IAttendEventRequest {
  @IsDefined()
  @IsNotEmpty()
  attendanceCode: string;

  @Allow()
  asStaff?: boolean;
}

export class AttendViaExpressCheckinRequest implements IAttendViaExpressCheckinRequest {
  @IsDefined()
  @IsNotEmpty()
  attendanceCode: string;

  @IsDefined()
  @IsEmail()
  email: string;
}
