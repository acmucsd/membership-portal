import {
  JsonController, Get, Patch, Delete, Post, UseBefore, Param, ForbiddenError, QueryParams, UploadedFile, Body,
} from 'routing-controllers';
import { Inject } from 'typedi';
import EventService from '../../services/EventService';
import { UserAuthentication, OptionalUserAuthentication } from '../middleware/UserAuthentication';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { UserModel } from '../../models/UserModel';
import PermissionsService from '../../services/PermissionsService';
import StorageService from '../../services/StorageService';
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
  AddEventFeedbackRequest,
  AddEventFeedbackResponse,
} from '../../types';
import { EventSearchOptions, PatchEventRequest, CreateEventRequest } from '../validators/EventControllerRequests';

@JsonController('/event')
export class EventController {
  @Inject()
  eventService: EventService;

  @Inject()
  storageService: StorageService;

  @UseBefore(OptionalUserAuthentication)
  @Get('/past')
  async getPastEvents(@QueryParams() options: EventSearchOptions,
    @AuthenticatedUser() user: UserModel): Promise<GetPastEventsResponse> {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const canSeeFeedback = !!user && PermissionsService.canSeeFeedback(user);
    const events = await this.eventService.getPastEvents(canSeeAttendanceCode, canSeeFeedback, options);
    return { error: null, events };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get('/future')
  async getFutureEvents(@QueryParams() options: EventSearchOptions,
    @AuthenticatedUser() user: UserModel): Promise<GetFutureEventsResponse> {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const canSeeFeedback = !!user && PermissionsService.canSeeFeedback(user);
    const events = await this.eventService.getFutureEvents(canSeeAttendanceCode, canSeeFeedback, options);
    return { error: null, events };
  }

  @UseBefore(UserAuthentication)
  @Post('/picture/:uuid')
  async updateEventCover(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.BANNER) }) file: File,
    @Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<UpdateEventCoverResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const cover = await this.storageService.upload(file, MediaType.EVENT_COVER, uuid);
    const event = await this.eventService.updateByUuid(uuid, { cover });
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Get('/:uuid')
  async getOneEvent(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<GetOneEventResponse> {
    const canSeeAttendanceCode = PermissionsService.canEditEvents(user);
    const canSeeFeedback = PermissionsService.canSeeFeedback(user);
    const event = await this.eventService.findByUuid(uuid, canSeeAttendanceCode, canSeeFeedback);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Patch('/:uuid')
  async updateEvent(@Param('uuid') uuid: Uuid,
    @Body() patchEventRequest: PatchEventRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.updateByUuid(uuid, patchEventRequest.event);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Delete('/:uuid')
  async deleteEvent(@Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel): Promise<DeleteEventResponse> {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    await this.eventService.deleteByUuid(uuid);
    return { error: null };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get()
  async getAllEvents(@QueryParams() options: EventSearchOptions, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const canSeeFeedback = !!user && PermissionsService.canSeeFeedback(user);
    const events = await this.eventService.getAllEvents(canSeeAttendanceCode, canSeeFeedback, options);
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

  @UseBefore(UserAuthentication)
  @Post('/feedback/:uuid')
  async addEventFeedback(@Param('uuid') uuid: Uuid, @Body() addEventFeedbackRequest: AddEventFeedbackRequest,
    @AuthenticatedUser() user: UserModel): Promise<AddEventFeedbackResponse> {
    const eventFeedback = await this.eventService.addEventFeedback(uuid, addEventFeedbackRequest.feedback, user);
    return { error: null, eventFeedback };
  }
}
