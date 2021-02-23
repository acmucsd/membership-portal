import {
  JsonController, Get, Patch, Delete, Post, UseBefore, Param, Params, ForbiddenError, QueryParams, UploadedFile, Body,
} from 'routing-controllers';
import { Inject } from 'typedi';
import EventService from '../../services/EventService';
import { UserAuthentication, OptionalUserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import PermissionsService from '../../services/PermissionsService';
import StorageService from '../../services/StorageService';
import AttendanceService from '../../services/AttendanceService';
import {
  Uuid,
  MediaType,
  File,
  CreateEventResponse,
  PatchEventResponse,
  DeleteEventResponse,
  GetOneEventResponse,
  UpdateEventCoverResponse,
  GetFutureEventsResponse,
  GetPastEventsResponse,
  ValidUuid
} from '../../types';
import {
  EventSearchOptions,
  PatchEventRequest,
  CreateEventRequest,
  SubmitEventFeedbackRequest,
} from '../validators/EventControllerRequests';

@JsonController('/event')
export class EventController {
  @Inject()
  eventService: EventService;

  @Inject()
  storageService: StorageService;

  @Inject()
  attendanceService: AttendanceService;

  @UseBefore(OptionalUserAuthentication)
  @Get('/past')
  async getPastEvents(@QueryParams() options: EventSearchOptions,
    @AuthenticatedUser() user: UserModel): Promise<GetPastEventsResponse> {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getPastEvents(canSeeAttendanceCode, options);
    return { error: null, events };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get('/future')
  async getFutureEvents(@QueryParams() options: EventSearchOptions,
    @AuthenticatedUser() user: UserModel): Promise<GetFutureEventsResponse> {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getFutureEvents(canSeeAttendanceCode, options);
    return { error: null, events };
  }

  @UseBefore(UserAuthentication)
  @Post('/picture/:uuid')
  async updateEventCover(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.BANNER) }) file: File,
    @Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<UpdateEventCoverResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const cover = await this.storageService.upload(file, MediaType.EVENT_COVER, vUuid.uuid);
    const event = await this.eventService.updateByUuid(vUuid.uuid, { cover });
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Post('/:uuid/feedback')
  async submitEventFeedback(@Params() vUuid: ValidUuid, @Body() submitEventFeedbackRequest: SubmitEventFeedbackRequest,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canSubmitFeedback(user)) throw new ForbiddenError();
    await this.attendanceService.submitEventFeedback(submitEventFeedbackRequest.feedback, vUuid.uuid, user);
    return { error: null };
  }

  @UseBefore(UserAuthentication)
  @Get('/:uuid')
  async getOneEvent(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneEventResponse> {
    const canSeeAttendanceCode = PermissionsService.canEditEvents(user);
    const event = await this.eventService.findByUuid(vUuid.uuid, canSeeAttendanceCode);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Patch('/:uuid')
  async updateEvent(@Params() vUuid: ValidUuid,
    @Body() patchEventRequest: PatchEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.updateByUuid(vUuid.uuid, patchEventRequest.event);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Delete('/:uuid')
  async deleteEvent(@Params() vUuid: ValidUuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    await this.eventService.deleteByUuid(vUuid.uuid);
    return { error: null };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get()
  async getAllEvents(@QueryParams() options: EventSearchOptions, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getAllEvents(canSeeAttendanceCode, options);
    return { error: null, events };
  }

  @UseBefore(UserAuthentication)
  @Post()
  async createEvent(@Body() createEventRequest: CreateEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<CreateEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.create(createEventRequest.event);
    return { error: null, event };
  }
}
