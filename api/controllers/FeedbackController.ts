import { Body, ForbiddenError, Get, JsonController, Param, Patch, Post, UseBefore } from 'routing-controllers';
import { Inject } from 'typedi';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';
import PermissionsService from '../../services/PermissionsService';
import FeedbackService from '../../services/FeedbackService';
import { GetFeedbackResponse, SubmitFeedbackResponse, Uuid } from '../../types';
import { UserAuthentication } from '../middleware/UserAuthentication';
import {
  SubmitEventFeedbackRequest,
  SubmitFeedbackRequest,
} from '../validators/FeedbackControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/feedback')
export class FeedbackController {
  @Inject()
  private attendanceService: AttendanceService;

  @Inject()
  private feedbackService: FeedbackService;

  @Post('/event/:uuid')
  async submitEventFeedback(@Param('uuid') uuid: Uuid, @Body() submitEventFeedbackRequest: SubmitEventFeedbackRequest,
    @AuthenticatedUser() user: UserModel) {
    await this.attendanceService.submitEventFeedback(submitEventFeedbackRequest.feedback, uuid, user);
    return { error: null };
  }

  @Get()
  async getFeedback(@AuthenticatedUser() user: UserModel): Promise<GetFeedbackResponse> {
    const canSeeAllFeedback = PermissionsService.canSeeFeedback(user);
    const feedback = await this.feedbackService.getFeedback(canSeeAllFeedback, user);
    return { error: null, feedback };
  }

  @Post()
  async submitFeedback(@Body() submitFeedbackRequest: SubmitFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<SubmitFeedbackResponse> {
    const feedback = await this.feedbackService.submitFeedback(user, submitFeedbackRequest.feedback);
    return { error: null, feedback };
  }

  @Patch('/:uuid')
  async acknowledgeFeedback(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<SubmitFeedbackResponse> {
    if (!PermissionsService.canSeeFeedback(user)) throw new ForbiddenError();
    const feedback = await this.feedbackService.acknowledgeFeedback(uuid);
    return { error: null, feedback };
  }
}
