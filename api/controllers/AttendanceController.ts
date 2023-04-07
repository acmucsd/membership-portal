import { JsonController, Get, Post, UseBefore, Params, ForbiddenError, Body } from 'routing-controllers';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { AttendEventRequest, AttendEventUnregisteredRequest } from '../validators/AttendanceControllerRequests';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';
import PermissionsService from '../../services/PermissionsService';
import { GetAttendancesForEventResponse, GetAttendancesForUserResponse, AttendEventResponse } from '../../types';
import { UuidParam } from '../validators/GenericRequests';

@JsonController('/attendance')
export class AttendanceController {
  private attendanceService: AttendanceService;

  constructor(attendanceService: AttendanceService) {
    this.attendanceService = attendanceService;
  }

  @UseBefore(UserAuthentication)
  @Get('/:uuid')
  async getAttendancesForEvent(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetAttendancesForEventResponse> {
    if (!PermissionsService.canSeeEventAttendances(user)) throw new ForbiddenError();
    const attendances = await this.attendanceService.getAttendancesForEvent(params.uuid);
    return { error: null, attendances };
  }

  @UseBefore(UserAuthentication)
  @Get()
  async getAttendancesForCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetAttendancesForUserResponse> {
    const attendances = await this.attendanceService.getAttendancesForUser(user);
    return { error: null, attendances };
  }

  @UseBefore(UserAuthentication)
  @Post()
  async attendEvent(@Body() body: AttendEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<AttendEventResponse> {
    const { event } = await this.attendanceService.attendEvent(user, body.attendanceCode, body.asStaff);
    return { error: null, event };
  }

  @Post('/express')
  async attendEventUnregistered(@Body() body: AttendEventUnregisteredRequest): Promise<AttendEventResponse> {
    const { event } = await this.attendanceService.attendEventUnregistered(body.attendanceCode, body.email);
    return { error: null, event };
  }
}
