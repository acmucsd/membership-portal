import { JsonController, Get, Post, UseBefore, Params, ForbiddenError, Body } from 'routing-controllers';
import { Inject } from 'typedi';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { AttendEventRequest } from '../validators/AttendanceControllerRequests';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';
import PermissionsService from '../../services/PermissionsService';
import { Uuid, GetAttendancesForEventResponse, GetAttendancesForUserResponse, AttendEventResponse } from '../../types';
import { ValidUuid } from '../../types/ApiParams';

@UseBefore(UserAuthentication)
@JsonController('/attendance')
export class AttendanceController {
  @Inject()
  private attendanceService: AttendanceService;

  @Get('/:uuid')
  async getAttendancesForEvent(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<GetAttendancesForEventResponse> {
    if (!PermissionsService.canSeeEventAttendances(user)) throw new ForbiddenError();
    const attendances = await this.attendanceService.getAttendancesForEvent(vUuid.uuid);
    return { error: null, attendances };
  }

  @Get()
  async getAttendancesForCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetAttendancesForUserResponse> {
    const attendances = await this.attendanceService.getAttendancesForUser(user);
    return { error: null, attendances };
  }

  @Post()
  async attendEvent(@Body() body: AttendEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<AttendEventResponse> {
    const { event } = await this.attendanceService.attendEvent(user, body.attendanceCode, body.asStaff);
    return { error: null, event };
  }
}
