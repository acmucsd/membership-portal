import { BodyParam, JsonController, Post, UploadedFile, UseBefore, ForbiddenError } from 'routing-controllers';
import { Inject } from 'typedi';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { CreateBonusRequest, CreateMilestoneRequest } from '../validators/AdminControllerRequests';
import { File, MediaType } from '../../types';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import PermissionsService from '../../services/PermissionsService';
import { UserModel } from '../../models/UserModel';

@UseBefore(UserAuthentication)
@JsonController('/admin')
export class AdminController {
  @Inject()
  private storageService: StorageService;

  @Inject()
  private userAccountService: UserAccountService;

  @Post('/milestone')
  async createMilestone(@BodyParam('milestone') milestone: CreateMilestoneRequest,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canCreateMilestones(user)) throw new ForbiddenError();
    await this.userAccountService.createMilestone(milestone);
    return { error: null };
  }

  @Post('/bonus')
  async addBonus(@BodyParam('bonus') bonus: CreateBonusRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canGrantPointBonuses(user)) throw new ForbiddenError();
    const emails = bonus.users;
    await this.userAccountService.grantBonusPoints(emails, bonus.description, bonus.points);
    return { error: null, emails };
  }

  @Post('/banner')
  async uploadBanner(@UploadedFile('image', { options: StorageService.getFileOptions(MediaType.BANNER) }) file: File) {
    const banner = await this.storageService.upload(file, MediaType.BANNER, 'banner');
    return { error: null, banner };
  }
}
