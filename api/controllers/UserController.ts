import {
  JsonController, Param, Get, Post, Patch, NotFoundError, BodyParam, UseBefore, UploadedFile,
} from 'routing-controllers';
import { UserModel } from '@Models/UserModel';
import UserAccountService from '@Services/UserAccountService';
import { Inject } from 'typedi';
import StorageService from '@Services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { MediaType, Uuid, File } from '../../types';
import { PatchUserRequest } from '../validators/UserControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/user')
export class UserController {
  @Inject()
  private userAccountService: UserAccountService;

  @Inject()
  private storageService: StorageService;

  @Get('/activity')
  async getUserActivityStream(@AuthenticatedUser() user: UserModel) {
    const stream = await this.userAccountService.getUserActivityStream(user.uuid);
    return { error: null, activity: stream };
  }

  @Post('/picture')
  async updateProfilePicture(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.PROFILE_PICTURE) }) file: File,
    @AuthenticatedUser() user: UserModel) {
    const profilePicture = await this.storageService.upload(file, MediaType.PROFILE_PICTURE, user.uuid);
    const updatedUser = await this.userAccountService.updateProfilePicture(user, profilePicture);
    return { error: null, user: updatedUser };
  }

  @Get('/:uuid')
  async getUser(@Param('uuid') uuid: Uuid, @AuthenticatedUser() currentUser: UserModel) {
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
  async getCurrentUser(@AuthenticatedUser() user: UserModel) {
    return { error: null, user: user.getFullUserProfile() };
  }

  @Patch()
  async patchCurrentUser(@BodyParam('user') patches: PatchUserRequest, @AuthenticatedUser() user: UserModel) {
    const patchedUser = await this.userAccountService.update(user, patches);
    return { error: null, user: patchedUser.getFullUserProfile() };
  }
}
