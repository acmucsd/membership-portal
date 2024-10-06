import {
  Body,
  ForbiddenError,
  Get,
  JsonController,
  Params,
  Patch,
  Post,
  UseBefore,
  QueryParams,
} from 'routing-controllers';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import PermissionsService from '../../services/PermissionsService';
import FeedbackService from '../../services/FeedbackService';
import {
  GetFeedbackResponse,
  SubmitFeedbackResponse,
  UpdateFeedbackStatusResponse,
} from '../../types';
import { UuidParam } from '../validators/GenericRequests';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  SubmitFeedbackRequest,
  UpdateFeedbackStatusRequest,
  FeedbackSearchOptions,
} from '../validators/FeedbackControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/feedback')
export class FeedbackController {
  private feedbackService: FeedbackService;

  constructor(feedbackService: FeedbackService) {
    this.feedbackService = feedbackService;
  }

  @Get()
  async getFeedback(
    @QueryParams() options: FeedbackSearchOptions,
    @AuthenticatedUser() user: UserModel,
  ): Promise<GetFeedbackResponse> {
    const canSeeAllFeedback = PermissionsService.canSeeAllFeedback(user);
    const feedback = await this.feedbackService.getFeedback(
      canSeeAllFeedback,
      user,
      options,
    );
    return {
      error: null,
      feedback: feedback.map((fb) => fb.getPublicFeedback()),
    };
  }

  @Post()
  async submitFeedback(
    @Body() submitFeedbackRequest: SubmitFeedbackRequest,
    @AuthenticatedUser() user: UserModel,
  ): Promise<SubmitFeedbackResponse> {
    if (!PermissionsService.canSubmitFeedback(user)) throw new ForbiddenError();
    const feedback = await this.feedbackService.submitFeedback(
      user,
      submitFeedbackRequest.feedback,
    );
    return { error: null, feedback: feedback.getPublicFeedback() };
  }

  @Patch('/:uuid')
  async updateFeedbackStatus(
    @Params() params: UuidParam,
    @Body() updateFeedbackStatusRequest: UpdateFeedbackStatusRequest,
    @AuthenticatedUser() user: UserModel,
  ): Promise<UpdateFeedbackStatusResponse> {
    if (!PermissionsService.canSeeAllFeedback(user)) throw new ForbiddenError();
    const feedback = await this.feedbackService.updateFeedbackStatus(
      params.uuid,
      updateFeedbackStatusRequest.status,
    );
    return { error: null, feedback: feedback.getPublicFeedback() };
  }
}
