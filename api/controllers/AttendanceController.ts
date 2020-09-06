import { JsonController, Get, Post, UseBefore, Param, ForbiddenError, Body } from 'routing-controllers';
import { UserAuthentication } from 'api/middleware/UserAuthentication';
import { AuthenticatedUser } from 'api/decorators/AuthenticatedUser';
import { AttendEventRequest } from 'api/validators/AttendanceControllerRequests';
import { UserModel } from '@Models/UserModel';
import { Inject } from 'typedi';
import AttendanceService from '@Services/AttendanceService';
import PermissionsService from '@Services/PermissionsService';
import { Uuid } from '../../types';

@UseBefore(UserAuthentication)
@JsonController('/attendance')
export class AttendanceController {
  @Inject()
  private attendanceService: AttendanceService;

  @Get('/:uuid')
  async getAttendancesForEvent(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canSeeEventAttendances(user)) throw new ForbiddenError();
    const attendances = await this.attendanceService.getAttendancesForEvent(uuid);
    return { error: null, attendances };
  }

  @Get()
  async getAttendancesForCurrentUser(@AuthenticatedUser() user: UserModel) {
    const attendances = await this.attendanceService.getAttendancesForUser(user);
    return { error: null, attendances };
  }

  @Post()
  async attendEvent(@Body() body: AttendEventRequest, @AuthenticatedUser() user: UserModel) {
    await this.attendanceService.attendEvent(user, body.attendanceCode, body.asStaff);
    return { error: null };
  }
}
