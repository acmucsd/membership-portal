import { IsDefined, IsNotEmpty, Allow, IsEmail } from 'class-validator';
import {
  AttendEventRequest as IAttendEventRequest,
  AttendEventUnregisteredRequest as IAttendEventUnregisteredRequest
} from '../../types';

export class AttendEventRequest implements IAttendEventRequest {
  @IsDefined()
  @IsNotEmpty()
  attendanceCode: string;

  @Allow()
  asStaff?: boolean;
}

export class AttendEventUnregisteredRequest implements IAttendEventUnregisteredRequest {
  @IsDefined()
  @IsNotEmpty()
  attendanceCode: string;

  @IsDefined()
  @IsEmail()
  email: string;
}
