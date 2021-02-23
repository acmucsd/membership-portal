import { Body, ForbiddenError, Get, JsonController, Params, Patch, Post, UseBefore } from 'routing-controllers';
import { Inject } from 'typedi';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import PermissionsService from '../../services/PermissionsService';
import FeedbackService from '../../services/FeedbackService';
import { GetFeedbackResponse, SubmitFeedbackResponse, UpdateFeedbackStatusResponse, ValidUuid } from '../../types';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  SubmitFeedbackRequest,
  UpdateFeedbackStatusRequest,
} from '../validators/FeedbackControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/feedback')
export class FeedbackController {
  @Inject()
  private feedbackService: FeedbackService;

  @Get()
  async getFeedback(@AuthenticatedUser() user: UserModel): Promise<GetFeedbackResponse> {
    const canSeeAllFeedback = PermissionsService.canRespondToFeedback(user);
    const feedback = await this.feedbackService.getFeedback(canSeeAllFeedback, user);
    return { error: null, feedback };
  }

  @Post()
  async submitFeedback(@Body() submitFeedbackRequest: SubmitFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<SubmitFeedbackResponse> {
    if (!PermissionsService.canSubmitFeedback(user)) throw new ForbiddenError();
    const feedback = await this.feedbackService.submitFeedback(user, submitFeedbackRequest.feedback);
    return { error: null, feedback };
  }

  @Patch('/:uuid')
  async updateFeedbackStatus(@Params() vUuid: ValidUuid,
    @Body() updateFeedbackStatusRequest: UpdateFeedbackStatusRequest,
    @AuthenticatedUser() user: UserModel): Promise<UpdateFeedbackStatusResponse> {
    if (!PermissionsService.canRespondToFeedback(user)) throw new ForbiddenError();
    const feedback = await this.feedbackService.updateFeedbackStatus(vUuid.uuid, updateFeedbackStatusRequest.status);
    return { error: null, feedback };
  }
}
