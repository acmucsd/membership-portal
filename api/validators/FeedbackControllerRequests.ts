import { Type } from 'class-transformer';
import { Allow, IsDefined, IsNotEmpty, MinLength, ValidateNested } from 'class-validator';
import { IsValidFeedbackType, IsValidFeedbackStatus } from '../decorators';
import {
  SubmitEventFeedbackRequest as ISubmitEventFeedbackRequest,
  SubmitFeedbackRequest as ISubmitFeedbackRequest,
  UpdateFeedbackStatusRequest as IUpdateFeedbackStatusRequest,
  FeedbackSearchOptions as IFeedbackSearchOptions,
  Feedback as IFeedback,
  FeedbackType,
  FeedbackStatus,
  Uuid,
} from '../../types';

export class Feedback implements IFeedback {
  @IsDefined()
  @IsNotEmpty()
  event: Uuid;

  @IsDefined()
  source: string;

  @IsDefined()
  @MinLength(20)
  description: string;

  @IsDefined()
  @IsValidFeedbackType()
  type: FeedbackType;
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

  @Allow()
  user?: string;
}
