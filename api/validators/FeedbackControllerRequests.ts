import { Type } from 'class-transformer';
import { Allow, IsDefined, IsNotEmpty, MinLength, ValidateNested } from 'class-validator';
import { IsValidFeedbackType, IsValidFeedbackStatus } from '../decorators/Validators';
import {
  SubmitEventFeedbackRequest as ISubmitEventFeedbackRequest,
  SubmitFeedbackRequest as ISubmitFeedbackRequest,
  UpdateFeedbackStatusRequest as IUpdateFeedbackStatusRequest,
  FeedbackSearchOptions as IFeedbackSearchOptions,
  Feedback as IFeedback,
  FeedbackType,
  FeedbackStatus,
  Event,
} from '../../types';
import { UserModel } from '../../models/UserModel';
import { EventModel } from '../../models/EventModel';

export class Feedback implements IFeedback {
  @IsDefined()
  @IsNotEmpty()
  user: UserModel;

  @IsDefined()
  @IsNotEmpty()
  event: EventModel;

  @IsDefined()
  source: string;

  @IsDefined()
  timestamp: Date

  @IsDefined()
  @MinLength(20)
  description: string;

  @IsDefined()
  @IsValidFeedbackType()
  type: FeedbackType;

  @IsDefined()
  @IsValidFeedbackStatus()
  status: FeedbackStatus;
}

export class SubmitEventFeedbackRequest implements ISubmitEventFeedbackRequest {
  @IsDefined()
  feedback: string[];
}

export class SubmitFeedbackRequest implements ISubmitFeedbackRequest {
  @Type(() => Feedback)
  @ValidateNested()
  @IsDefined()
  feedback: Feedback;
}

export class UpdateFeedbackStatusRequest implements IUpdateFeedbackStatusRequest {
  @IsDefined()
  @IsValidFeedbackStatus()
  status: FeedbackStatus;
}

export class FeedbackSearchOptions implements IFeedbackSearchOptions {
  @Allow()
  event?: string;

  @Allow()
  status?: string;

  @Allow()
  type?: string;
}
