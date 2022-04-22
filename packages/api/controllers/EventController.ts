import {
  JsonController, Get, Patch, Delete, Post, UseBefore, Params, ForbiddenError, QueryParams, UploadedFile, Body,
} from 'routing-controllers';
import EventService from '../../services/EventService';
import { UserAuthentication, OptionalUserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import PermissionsService from '../../services/PermissionsService';
import StorageService from '../../services/StorageService';
import AttendanceService from '../../services/AttendanceService';
import {
  MediaType,
  File,
  CreateEventResponse,
  PatchEventResponse,
  DeleteEventResponse,
  GetOneEventResponse,
  UpdateEventCoverResponse,
  GetFutureEventsResponse,
  GetPastEventsResponse,
} from '../../types';
import { UuidParam } from '../validators/GenericRequests';
import {
  EventSearchOptions,
  PatchEventRequest,
  CreateEventRequest,
  SubmitEventFeedbackRequest,
} from '../validators/EventControllerRequests';

@JsonController('/event')
export class EventController {
  private eventService: EventService;

  private storageService: StorageService;

  private attendanceService: AttendanceService;

  constructor(eventService: EventService, storageService: StorageService, attendanceService: AttendanceService) {
    this.eventService = eventService;
    this.storageService = storageService;
    this.attendanceService = attendanceService;
  }

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
    { options: StorageService.getFileOptions(MediaType.EVENT_COVER) }) file: File,
    @Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<UpdateEventCoverResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const cover = await this.storageService.upload(file, MediaType.EVENT_COVER, params.uuid);
    const event = await this.eventService.updateByUuid(params.uuid, { cover });
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Post('/:uuid/feedback')
  async submitEventFeedback(@Params() params: UuidParam, @Body() submitEventFeedbackRequest: SubmitEventFeedbackRequest,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canSubmitFeedback(user)) throw new ForbiddenError();
    await this.attendanceService.submitEventFeedback(submitEventFeedbackRequest.feedback, params.uuid, user);
    return { error: null };
  }

  @UseBefore(UserAuthentication)
  @Get('/:uuid')
  async getOneEvent(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<GetOneEventResponse> {
    const canSeeAttendanceCode = PermissionsService.canEditEvents(user);
    const event = await this.eventService.findByUuid(params.uuid, canSeeAttendanceCode);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Patch('/:uuid')
  async updateEvent(@Params() params: UuidParam,
    @Body() patchEventRequest: PatchEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.updateByUuid(params.uuid, patchEventRequest.event);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Delete('/:uuid')
  async deleteEvent(@Params() params: UuidParam,
    @AuthenticatedUser() user: UserModel): Promise<DeleteEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    await this.eventService.deleteByUuid(params.uuid);
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
