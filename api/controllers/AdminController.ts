import { JsonController, Post, UploadedFile, UseBefore, ForbiddenError, Body, Get } from 'routing-controllers';
import { Inject } from 'typedi';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  CreateBonusRequest,
  CreateMilestoneRequest,
  SubmitAttendanceForUserRequest,
} from '../validators/AdminControllerRequests';
import {
  File,
  MediaType,
  CreateMilestoneResponse,
  CreateBonusResponse,
  UploadBannerResponse,
  GetAllEmailsResponse,
  AttendEventResponse,
} from '../../types';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import PermissionsService from '../../services/PermissionsService';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';

@UseBefore(UserAuthentication)
@JsonController('/admin')
export class AdminController {
  @Inject()
  private storageService: StorageService;

  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private attendanceService: AttendanceService;

  @Get('/email')
  async getAllEmails(@AuthenticatedUser() user: UserModel): Promise<GetAllEmailsResponse> {
    if (!PermissionsService.canSeeAllUserEmails(user)) throw new ForbiddenError();
    const emails = await this.userAccountService.getAllEmails();
    return { error: null, emails };
  }

  @Post('/milestone')
  async createMilestone(@Body() createMilestoneRequest: CreateMilestoneRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateMilestoneResponse> {
    if (!PermissionsService.canCreateMilestones(user)) throw new ForbiddenError();
    await this.userAccountService.createMilestone(createMilestoneRequest.milestone);
    return { error: null };
  }

  @Post('/bonus')
  async addBonus(@Body() createBonusRequest: CreateBonusRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateBonusResponse> {
    if (!PermissionsService.canGrantPointBonuses(user)) throw new ForbiddenError();
    const { bonus } = createBonusRequest;
    const emails = bonus.users.map((e) => e.toLowerCase());
    await this.userAccountService.grantBonusPoints(emails, bonus.description, bonus.points);
    return { error: null, emails };
  }

  @Post('/banner')
  async uploadBanner(@UploadedFile(
    'image', { options: StorageService.getFileOptions(MediaType.BANNER) },
  ) file: File): Promise<UploadBannerResponse> {
    const banner = await this.storageService.upload(file, MediaType.BANNER, 'banner');
    return { error: null, banner };
  }

  @Post('/attendance')
  async submitAttendanceForUser(@Body() submitAttendanceForUserRequest: SubmitAttendanceForUserRequest,
    @AuthenticatedUser() currentUser: UserModel): Promise<AttendEventResponse> {
    if (!PermissionsService.canSubmitAttendanceForUsers(currentUser)) throw new ForbiddenError();
    const { user, event: eventToAttend, asStaff } = submitAttendanceForUserRequest;
    const { event } = await this.attendanceService.submitAttendanceForUser(user, eventToAttend, asStaff, currentUser);
    return { error: null, event };
  }
}
