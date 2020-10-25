import { Body, ForbiddenError, Get, JsonController, Param, Patch, Post, UseBefore } from 'routing-controllers';
import { Inject } from 'typedi';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import AttendanceService from '../../services/AttendanceService';
import PermissionsService from '../../services/PermissionsService';
import FeedbackService from '../../services/FeedbackService';
import { GetFeedbackResponse, AddFeedbackResponse, AddEventFeedbackRequest, Uuid } from '../../types';
import { UserAuthentication } from '../middleware/UserAuthentication';
import { AddFeedbackRequest, PatchFeedbackRequest } from '../validators/FeedbackControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/feedback')
export class FeedbackController {
  @Inject()
  private attendanceService: AttendanceService;

  @Inject()
  private feedbackService: FeedbackService;

  @Post('/event/:uuid')
  async addEventFeedback(@Param('uuid') uuid: Uuid, @Body() addEventFeedbackRequest: AddEventFeedbackRequest,
    @AuthenticatedUser() user: UserModel) {
    await this.attendanceService.addEventFeedback(addEventFeedbackRequest.feedback, uuid, user);
    return { error: null };
  }

  @Get()
  async getFeedback(@AuthenticatedUser() user: UserModel): Promise<GetFeedbackResponse> {
    const canSeeAllFeedback = PermissionsService.canSeeFeedback(user);
    const feedback = await this.feedbackService.getFeedback(canSeeAllFeedback, user);
    return { error: null, feedback };
  }

  @Post()
  async addFeedback(@Body() addFeedbackRequest: AddFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<AddFeedbackResponse> {
    const feedback = await this.feedbackService.addFeedback(user, addFeedbackRequest.feedback);
    return { error: null, feedback };
  }

  @Patch('/:uuid')
  async updateFeedback(@Param('uuid') uuid: Uuid, @Body() patchFeedbackRequest: PatchFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<AddFeedbackResponse> {
    const canAcknowledgeFeedback = PermissionsService.canSeeFeedback(user);
    if (patchFeedbackRequest.feedback.acknowledged !== null && !canAcknowledgeFeedback) throw new ForbiddenError();
    const feedback = await this.feedbackService.updateFeedback(uuid, patchFeedbackRequest.feedback);
    return { error: null, feedback };
  }
}
