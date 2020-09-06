import {
  JsonController, Get, Patch, Delete, Post, UseBefore, Param, BodyParam, ForbiddenError, QueryParams, UploadedFile,
} from 'routing-controllers';
import { Inject } from 'typedi';
import EventService from '@Services/EventService';
import { UserAuthentication, OptionalUserAuthentication } from 'api/middleware/UserAuthentication';
import { AuthenticatedUser } from 'api/decorators/AuthenticatedUser';
import { UserModel } from '@Models/UserModel';
import PermissionsService from '@Services/PermissionsService';
import StorageService from '@Services/StorageService';
import { Uuid, MediaType, File } from '../../types';
import { EventSearchOptions, PatchEventRequest, PostEventRequest } from '../validators/EventControllerRequests';

@JsonController('/event')
export class EventController {
  @Inject()
  eventService: EventService;

  @Inject()
  storageService: StorageService;

  @UseBefore(OptionalUserAuthentication)
  @Get('/past')
  async getPastEvents(@QueryParams() options: EventSearchOptions, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getPastEvents(canSeeAttendanceCode, options.offset, options.limit);
    return { error: null, events };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get('/future')
  async getFutureEvents(@QueryParams() options: EventSearchOptions, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getFutureEvents(canSeeAttendanceCode, options.offset, options.limit);
    return { error: null, events };
  }

  @UseBefore(UserAuthentication)
  @Post('/picture/:uuid')
  async updateEventCover(@UploadedFile('image',
    { options: StorageService.getFileOptions(MediaType.BANNER) }) file: File,
    @Param('uuid') uuid: Uuid,
    @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const cover = await this.storageService.upload(file, MediaType.EVENT_COVER, uuid);
    const event = await this.eventService.updateByUuid(uuid, { cover });
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Get('/:uuid')
  async getOneEvent(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = PermissionsService.canEditEvents(user);
    const event = await this.eventService.findByUuid(uuid, canSeeAttendanceCode);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Patch('/:uuid')
  async updateEvent(@Param('uuid') uuid: Uuid,
    @BodyParam('event') patches: PatchEventRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.updateByUuid(uuid, patches);
    return { error: null, event };
  }

  @UseBefore(UserAuthentication)
  @Delete('/:uuid')
  async deleteEvent(@Param('uuid') uuid: Uuid, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    await this.eventService.deleteByUuid(uuid);
    return { error: null };
  }

  @UseBefore(OptionalUserAuthentication)
  @Get()
  async getAllEvents(@QueryParams() options: EventSearchOptions, @AuthenticatedUser() user: UserModel) {
    const canSeeAttendanceCode = !!user && PermissionsService.canEditEvents(user);
    const events = await this.eventService.getAllEvents(canSeeAttendanceCode, options.offset, options.limit);
    return { error: null, events };
  }

  @UseBefore(UserAuthentication)
  @Post()
  async createEvent(@BodyParam('event') postEventRequest: PostEventRequest, @AuthenticatedUser() user: UserModel) {
    if (!PermissionsService.canEditEvents(user)) throw new ForbiddenError();
    const event = await this.eventService.create(postEventRequest);
    return { error: null, event };
  }
}
