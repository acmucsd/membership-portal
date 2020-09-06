import { Allow, IsNotEmpty, IsDateString, IsDefined } from 'class-validator';
import {
  EventSearchOptions as IEventSearchOptions,
  OptionalEventProperties as IOptionalEventProperties,
  PostEventRequest as IPostEventRequest,
  PatchEventRequest as IPatchEventRequest,
} from '../../types';

export class EventSearchOptions implements IEventSearchOptions {
  @Allow()
  offset?: number;

  @Allow()
  limit?: number;
}

export class OptionalEventProperties implements IOptionalEventProperties {
  @IsNotEmpty()
  organization?: string;

  @IsNotEmpty()
  committee?: string;

  @IsNotEmpty()
  thumbnail?: string;

  @IsNotEmpty()
  eventLink?: string;

  @Allow()
  requiresStaff?: boolean;

  @Allow()
  staffPointBonus?: number;
}

export class PostEventRequest extends OptionalEventProperties implements IPostEventRequest {
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

export class PatchEventRequest extends OptionalEventProperties implements IPatchEventRequest {
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
