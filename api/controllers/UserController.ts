import {
  JsonController, Param, Get, Post, Patch, NotFoundError, UseBefore, UploadedFile, Body,
} from 'routing-controllers';
import { Inject } from 'typedi';
import PermissionsService from '../../services/PermissionsService';
import { UserModel } from '../../models/UserModel';
import UserAccountService from '../../services/UserAccountService';
import StorageService from '../../services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import {
  MediaType,
  Uuid,
  File,
  GetUserActivityStreamResponse,
  UpdateProfilePictureResponse,
  GetUserResponse,
  GetCurrentUserResponse,
  PatchUserResponse,
  GetUserFeedbackResponse,
  AddUserFeedbackResponse,
} from '../../types';
import { AddUserFeedbackRequest, PatchUserRequest } from '../validators/UserControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/user')
export class UserController {
  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private storageService: StorageService;

  @Get('/activity')
  async getUserActivityStream(@AuthenticatedUser() user: UserModel): Promise<GetUserActivityStreamResponse> {
    const stream = await this.userAccountService.getUserActivityStream(user.uuid);
    return { error: null, activity: stream };
  }

  @Get('/feedback')
  async getUserFeedback(@AuthenticatedUser() user: UserModel): Promise<GetUserFeedbackResponse> {
    const canSeeAllUserFeedback = PermissionsService.canSeeAllUserFeedback(user);
    const feedback = await this.userAccountService.getUserFeedback(canSeeAllUserFeedback, user);
    return { error: null, feedback };
  }

  @Post('/feedback')
  async addUserFeedback(@Body() addUserFeedbackRequest: AddUserFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<AddUserFeedbackResponse> {
    const feedback = await this.userAccountService.addUserFeedback(user, addUserFeedbackRequest.feedback);
    return { error: null, feedback };
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
  async getUser(@Param('uuid') uuid: Uuid, @AuthenticatedUser() currentUser: UserModel): Promise<GetUserResponse> {
    if (uuid === currentUser.uuid) {
      return this.getCurrentUser(currentUser);
    }
    const user = await this.userAccountService.findByUuid(uuid);
    if (!user) {
      throw new NotFoundError('User was not found');
    }
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
