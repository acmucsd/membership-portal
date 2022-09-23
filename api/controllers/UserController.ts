import {
  JsonController, Params, Get, Post, Patch, UseBefore, UploadedFile, Body, BadRequestError,
} from 'routing-controllers';
import path = require('path');
import { lastIndexOf } from 'underscore';
import { UserModel } from '../../models/UserModel';
import UserAccountService from '../../services/UserAccountService';
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
  UpdateResumeResponse,
} from '../../types';
import { UuidParam } from '../validators/GenericRequests';
import { PatchUserRequest } from '../validators/UserControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/user')
export class UserController {
  private userAccountService: UserAccountService;

  private storageService: StorageService;

  constructor(userAccountService: UserAccountService, storageService: StorageService) {
    this.userAccountService = userAccountService;
    this.storageService = storageService;
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

  @Post('/resume')
  async updateResume(@UploadedFile('file',
    { options: StorageService.getFileOptions(MediaType.RESUME) }) file: File,
    @AuthenticatedUser() user: UserModel): Promise<UpdateResumeResponse> {
    if (path.extname(file.originalname) !== '.pdf') throw new BadRequestError('Filetype must be \'.pdf\'');
    await this.storageService.clearFolder(MediaType.RESUME, user.uuid);
    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const resume = await this.storageService.uploadToFolder(file, MediaType.RESUME, fileName, user.uuid);
    const updatedUser = await this.userAccountService.updateResume(user, resume);

    return { error: null, user: updatedUser.getFullUserProfile() };
  }

  @Get('/:uuid')
  async getUser(@Params() params: UuidParam, @AuthenticatedUser() currentUser: UserModel): Promise<GetUserResponse> {
    if (params.uuid === currentUser.uuid) {
      return this.getCurrentUser(currentUser);
    }
    const user = await this.userAccountService.findByUuid(params.uuid);
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
