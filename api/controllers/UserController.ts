import {
  JsonController, Params, Get, Post, Patch, UseBefore, UploadedFile, Body, Delete,
} from 'routing-controllers';
import { UserModel } from '../../models/UserModel';
import UserAccountService from '../../services/UserAccountService';
import UserSocialMediaService from '../../services/UserSocialMediaService';
import StorageService from '../../services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import {
  MediaType,
  File,
  GetUserActivityStreamResponse,
  UpdateProfilePictureResponse,
  GetUserResponse,
  GetCurrentUserResponse,
  PatchUserResponse,
  InsertSocialMediaResponse,
  UpdateSocialMediaResponse,
  DeleteSocialMediaResponse,
  ChangeCanSeeAttendanceResponse,
} from '../../types';
import { UserHandleParam, UuidParam } from '../validators/GenericRequests';
import { PatchUserRequest } from '../validators/UserControllerRequests';
import {
  InsertSocialMediaRequest,
  UpdateSocialMediaRequest,
} from '../validators/UserSocialMediaControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/user')
export class UserController {
  private userAccountService: UserAccountService;

  private userSocialMediaService: UserSocialMediaService;

  private storageService: StorageService;

  constructor(userAccountService: UserAccountService,
    storageService: StorageService,
    userSocialMediaService: UserSocialMediaService) {
    this.userAccountService = userAccountService;
    this.storageService = storageService;
    this.userSocialMediaService = userSocialMediaService;
  }

  @Get('/:uuid/activity/')
  async getUserActivityStream(@Params() params: UuidParam,
    @AuthenticatedUser() currentUser: UserModel): Promise<GetUserActivityStreamResponse> {
    if (params.uuid === currentUser.uuid) {
      return this.getCurrentUserActivityStream(currentUser);
    }
    const activityStream = await this.userAccountService.getUserActivityStream(params.uuid);
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
  async getUser(@Params() params: UuidParam, @AuthenticatedUser() currentUser: UserModel): Promise<GetUserResponse> {
    if (params.uuid === currentUser.uuid) {
      return this.getCurrentUser(currentUser);
    }
    const user = await this.userAccountService.findByUuid(params.uuid);
    const userProfile = await this.userAccountService.getPublicProfile(user);
    return { error: null, user: userProfile };
  }

  @Get('/handle/:handle')
  async getUserByHandle(@Params() params: UserHandleParam,
    @AuthenticatedUser() currentUser: UserModel): Promise<GetUserResponse> {
    if (params.handle === currentUser.handle) {
      return this.getCurrentUser(currentUser);
    }

    const user = await this.userAccountService.findByHandle(params.handle);
    return { error: null, user: user.getPublicProfile() };
  }

  @Get()
  async getCurrentUser(@AuthenticatedUser() user: UserModel): Promise<GetCurrentUserResponse> {
    const userProfile = await this.userAccountService.getFullUserProfile(user);
    return { error: null, user: userProfile };
  }

  @Patch()
  async patchCurrentUser(@Body() patchUserRequest: PatchUserRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchUserResponse> {
    const patchedUser = await this.userAccountService.update(user, patchUserRequest.user);
    return { error: null, user: patchedUser.getFullUserProfile() };
  }

  @Post('/socialMedia')
  async insertSocialMediaForUser(@Body() insertSocialMediaRequest: InsertSocialMediaRequest,
    @AuthenticatedUser() user: UserModel): Promise<InsertSocialMediaResponse> {
    const userSocialMedia = await this.userSocialMediaService
      .insertSocialMediaForUser(user, insertSocialMediaRequest.socialMedia);
    return { error: null, userSocialMedia: userSocialMedia.getPublicSocialMedia() };
  }

  @Patch('/socialMedia/:uuid')
  async updateSocialMediaForUser(@Params() params: UuidParam,
    @Body() updateSocialMediaRequest: UpdateSocialMediaRequest,
    @AuthenticatedUser() user: UserModel): Promise<UpdateSocialMediaResponse> {
    const userSocialMedia = await this.userSocialMediaService
      .updateSocialMediaByUuid(user, params.uuid, updateSocialMediaRequest.socialMedia);
    return { error: null, userSocialMedia: userSocialMedia.getPublicSocialMedia() };
  }

  @Delete('/socialMedia/:uuid')
  async deleteSocialMediaForUser(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<DeleteSocialMediaResponse> {
    await this.userSocialMediaService.deleteSocialMediaByUuid(user, params.uuid);
    return { error: null };
  }

  @Patch('/canSeeAttendance')
  async changeCanSeeAttendance(@AuthenticatedUser() user: UserModel): Promise<ChangeCanSeeAttendanceResponse> {
    await this.userAccountService.changeCanSeeAttendance(user);
    return { error: null, canSeeAttendance: user.canSeeAttendance };
  }
}
