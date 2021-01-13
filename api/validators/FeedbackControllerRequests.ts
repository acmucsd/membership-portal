import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, MinLength, ValidateNested } from 'class-validator';
import { IsValidFeedbackType, IsValidFeedbackStatus } from '../decorators/Validators';
import {
  SubmitEventFeedbackRequest as ISubmitEventFeedbackRequest,
  SubmitFeedbackRequest as ISubmitFeedbackRequest,
  UpdateFeedbackStatusRequest as IUpdateFeedbackStatusRequest,
  Feedback as IFeedback,
  FeedbackType,
  FeedbackStatus,
} from '../../types';

export class Feedback implements IFeedback {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  @MinLength(100)
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
