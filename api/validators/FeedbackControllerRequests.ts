import { Type } from 'class-transformer';
import { IsDefined, IsNotEmpty, ValidateNested } from 'class-validator';
import { IsValidFeedbackType } from '../decorators/Validators';
import {
  SubmitEventFeedbackRequest as ISubmitEventFeedbackRequest,
  SubmitFeedbackRequest as ISubmitFeedbackRequest,
  Feedback as IFeedback,
  FeedbackType,
} from '../../types';

export class Feedback implements IFeedback {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
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
