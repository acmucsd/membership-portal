import {
  JsonController, Params, Get, Post, Patch, UseBefore, UploadedFile, Body,
} from 'routing-controllers';
import { Inject } from 'typedi';
import { UserModel } from '../../models/UserModel';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import {
  MediaType,
  ValidUuid,
  File,
  GetUserActivityStreamResponse,
  UpdateProfilePictureResponse,
  GetUserResponse,
  GetCurrentUserResponse,
  PatchUserResponse,
} from '../../types';
import { PatchUserRequest } from '../validators/UserControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/user')
export class UserController {
  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private storageService: StorageService;

  @Get('/:uuid/activity/')
  async getUserActivityStream(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() currentUser: UserModel): Promise<GetUserActivityStreamResponse> {
    if (vUuid.uuid === currentUser.uuid) {
      return this.getCurrentUserActivityStream(currentUser);
    }
    const activityStream = await this.userAccountService.getUserActivityStream(vUuid.uuid);
    return { error: null, activity: activityStream };
  }

  @Get('/activity')
  async getCurrentUserActivityStream(@AuthenticatedUser() user: UserModel):
  Promise<GetUserActivityStreamResponse> {
    const activityStream = await this.userAccountService.getCurrentUserActivityStream(user.uuid);
    return { error: null, activity: activityStream };
  }

  @Post('/picture')
  async updateProfilePicture(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.PROFILE_PICTURE) }) file: File,
    @AuthenticatedUser() user: UserModel): Promise<UpdateProfilePictureResponse> {
    const profilePicture = await this.storageService.upload(file, MediaType.PROFILE_PICTURE, user.uuid);
    const updatedUser = await this.userAccountService.updateProfilePicture(user, profilePicture);
    return { error: null, user: updatedUser.getFullUserProfile() };
  }

  @Get('/:uuid')
  async getUser(@Params() vUuid: ValidUuid, @AuthenticatedUser() currentUser: UserModel): Promise<GetUserResponse> {
    if (vUuid.uuid === currentUser.uuid) {
      return this.getCurrentUser(currentUser);
    }
    const user = await this.userAccountService.findByUuid(vUuid.uuid);
    return { error: null, user: user.getPublicProfile() };
  }

  @Get()
  async getCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetCurrentUserResponse> {
    return { error: null, user: user.getFullUserProfile() };
  }

  @Patch()
  async patchCurrentUser(@Body() patchUserRequest: PatchUserRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchUserResponse> {
    const patchedUser = await this.userAccountService.update(user, patchUserRequest.user);
    return { error: null, user: patchedUser.getFullUserProfile() };
  }
}
