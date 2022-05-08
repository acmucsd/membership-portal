import { JsonController, Post, UploadedFile, UseBefore, ForbiddenError, Body, Get } from 'routing-controllers';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  CreateBonusRequest,
  CreateMilestoneRequest,
  SubmitAttendanceForUsersRequest,
} from '../validators/AdminControllerRequests';
import {
  File,
  MediaType,
  CreateMilestoneResponse,
  CreateBonusResponse,
  UploadBannerResponse,
  GetAllEmailsResponse,
  SubmitAttendanceForUsersResponse,
} from '@acmucsd/membership-portal-types';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import PermissionsService from '../../services/PermissionsService';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';

@UseBefore(UserAuthentication)
@JsonController('/admin')
export class AdminController {
  private storageService: StorageService;

  private userAccountService: UserAccountService;

  private attendanceService: AttendanceService;

  constructor(storageService: StorageService, userAccountService: UserAccountService,
    attendanceService: AttendanceService) {
    this.storageService = storageService;
    this.userAccountService = userAccountService;
    this.attendanceService = attendanceService;
  }

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
  async submitAttendanceForUsers(@Body() submitAttendanceForUsersRequest: SubmitAttendanceForUsersRequest,
    @AuthenticatedUser() currentUser: UserModel): Promise<SubmitAttendanceForUsersResponse> {
    if (!PermissionsService.canSubmitAttendanceForUsers(currentUser)) throw new ForbiddenError();
    const { users, event, asStaff } = submitAttendanceForUsersRequest;
    const emails = users.map((e) => e.toLowerCase());
    const attendances = await this.attendanceService.submitAttendanceForUsers(emails, event, asStaff, currentUser);
    return { error: null, attendances };
  }
}
