import { Allow, IsNotEmpty, IsDateString, IsDefined, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import {
  EventSearchOptions as IEventSearchOptions,
  OptionalEventProperties as IOptionalEventProperties,
  CreateEventRequest as ICreateEventRequest,
  PatchEventRequest as IPatchEventRequest,
  SubmitEventFeedbackRequest as ISubmitEventFeedbackRequest,
  Event as IEvent,
  Uuid,
} from '@customtypes';
import { IsValidEventFeedback } from '@decorators';

export class OptionalEventProperties implements IOptionalEventProperties {
  @IsNotEmpty()
  organization?: string;

  @IsNotEmpty()
  committee?: string;

  @IsNotEmpty()
  thumbnail?: string;

  @Allow()
  eventLink?: string;

  @Allow()
  requiresStaff?: boolean;

  @Allow()
  staffPointBonus?: number;

  @Allow()
  discordEvent?: Uuid;

  @Allow()
  googleCalendarEvent?: Uuid;
}

export class Event extends OptionalEventProperties implements IEvent {
  @IsNotEmpty()
  cover: string;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  location: string;

  @IsDefined()
  @IsDateString()
  start: Date;

  @IsDefined()
  @IsDateString()
  end: Date;

  @IsNotEmpty()
  attendanceCode: string;

  @IsDefined()
  pointValue: number;
}

export class EventPatches extends OptionalEventProperties implements IEvent {
  @IsNotEmpty()
  cover: string;

  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  location: string;

  @IsDateString()
  start: Date;

  @IsDateString()
  end: Date;

  @IsNotEmpty()
  attendanceCode: string;

  @Allow()
  pointValue: number;
}

export class EventSearchOptions implements IEventSearchOptions {
  @Allow()
  committee?: string;

  @Allow()
  offset?: number;

  @Allow()
  limit?: number;

  @Allow()
  reverse?: boolean;
}

export class CreateEventRequest implements ICreateEventRequest {
  @Type(() => Event)
  @ValidateNested()
  @IsDefined()
  event: Event;
}

export class PatchEventRequest implements IPatchEventRequest {
  @Type(() => EventPatches)
  @ValidateNested()
  @IsDefined()
  event: EventPatches;
}

export class SubmitEventFeedbackRequest implements ISubmitEventFeedbackRequest {
  @IsDefined()
  @ArrayNotEmpty()
  @IsValidEventFeedback()
  feedback: string[];
}
