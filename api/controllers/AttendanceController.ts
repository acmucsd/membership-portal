import { JsonController, Get, Post, UseBefore, Params, ForbiddenError, Body } from 'routing-controllers';
import { EmailService, AttendanceService, PermissionsService } from '../../services';
import { UserAuthentication } from '../middleware';
import { AuthenticatedUser } from '../decorators';
import { AttendEventRequest, AttendViaExpressCheckinRequest, UuidParam } from '../validators';
import { UserModel } from '../../models';
import { GetAttendancesForEventResponse, GetAttendancesForUserResponse, AttendEventResponse } from '../../types';

@JsonController('/attendance')
export class AttendanceController {
  private attendanceService: AttendanceService;

  private emailService: EmailService;

  constructor(attendanceService: AttendanceService, emailService: EmailService) {
    this.attendanceService = attendanceService;
    this.emailService = emailService;
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
    const attendances = await this.attendanceService.getAttendancesForCurrentUser(user);
    return { error: null, attendances };
  }

  @UseBefore(UserAuthentication)
  @Get('/user/:uuid')
  async getAttendancesForUser(@Params() params: UuidParam,
    @AuthenticatedUser() currentUser: UserModel): Promise<GetAttendancesForEventResponse> {
    if (params.uuid === currentUser.uuid) {
      return this.getAttendancesForCurrentUser(currentUser);
    }
    const attendances = await this.attendanceService.getAttendancesForUser(params.uuid);
    return { error: null, attendances };
  }

  @UseBefore(UserAuthentication)
  @Post()
  async attendEvent(@Body() body: AttendEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<AttendEventResponse> {
    const { event } = await this.attendanceService.attendEvent(user, body.attendanceCode, body.asStaff);
    return { error: null, event };
  }

  @Post('/expressCheckin')
  async attendViaExpressCheckin(@Body() body: AttendViaExpressCheckinRequest): Promise<AttendEventResponse> {
    body.email = body.email.toLowerCase();
    const { email, attendanceCode } = body;
    const { event } = await this.attendanceService.attendViaExpressCheckin(attendanceCode, email);
    await this.emailService.sendExpressCheckinConfirmation(email, event.title, event.pointValue);
    return { error: null, event };
  }
}
