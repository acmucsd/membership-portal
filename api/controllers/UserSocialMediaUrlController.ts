import { Body, Get, JsonController, Params, Patch, Post, UseBefore } from 'routing-controllers';
import UserSocialMediaUrlService from '../../services/UserSocialMediaUrlService';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import { UuidParam } from '../validators/GenericRequests';
import { GetUserSocialMediaUrlResponse, InsertSocialMediaUrlResponse, UpdateSocialMediaUrlResponse } from '../../types';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  InsertSocialMediaUrlRequest,
  UpdateSocialMediaUrlRequest,
} from '../validators/UserSocialMediaUrlControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/socialMedia')
export class UserSocialMediaUrlController {
  private userSocialMediaUrlService: UserSocialMediaUrlService;

  constructor(userSocialMediaService: UserSocialMediaUrlService) {
    this.userSocialMediaUrlService = userSocialMediaService;
  }

  @Get()
  async getSocialMediaUrlForUser(@AuthenticatedUser() user: UserModel): Promise<GetUserSocialMediaUrlResponse> {
    const userSocialMediaUrls = await this.userSocialMediaUrlService.getSocialMediaUrlsForUser(user);
    return { error: null, userSocialMediaUrls };
  }

  @Post()
  async insertSocialMediaUrlForUser(@Body() insertSocialMediaUrlRequest: InsertSocialMediaUrlRequest,
    @AuthenticatedUser() user: UserModel): Promise<InsertSocialMediaUrlResponse> {
    const userSocialMediaUrl = await this.userSocialMediaUrlService
      .insertSocialMediaUrlForUser(user, insertSocialMediaUrlRequest.socialMediaUrl);
    return { error: null, userSocialMediaUrl };
  }

  @Patch('/:uuid')
  async updateSocialMediaUrlForUser(@Params() params: UuidParam,
    @Body() updateSocialMediaUrlRequest: UpdateSocialMediaUrlRequest,
    @AuthenticatedUser() user: UserModel): Promise<UpdateSocialMediaUrlResponse> {
    const userSocialMediaUrl = await this.userSocialMediaUrlService
      .updateSocialMediaUrlByUuid(params.uuid, updateSocialMediaUrlRequest.url);
    return { error: null, userSocialMediaUrl };
  }
}
