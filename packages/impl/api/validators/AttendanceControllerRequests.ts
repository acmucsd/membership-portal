import { IsDefined, IsNotEmpty, Allow } from 'class-validator';
import { AttendEventRequest as IAttendEventRequest } from '@acmucsd/membership-portal-types';

export class AttendEventRequest implements IAttendEventRequest {
  @IsDefined()
  @IsNotEmpty()
  attendanceCode: string;

  @Allow()
  asStaff?: boolean;
}
