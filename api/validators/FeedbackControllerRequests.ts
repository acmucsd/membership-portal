import { Type } from 'class-transformer';
import { Allow, IsDefined, IsNotEmpty, ValidateNested } from 'class-validator';
import {
  AddFeedbackRequest as IAddFeedbackRequest,
  Feedback as IFeedback,
  FeedbackPatches as IFeedbackPatches,
  PatchFeedbackRequest as IPatchFeedbackRequest,
} from '../../types';

export class Feedback implements IFeedback {
  @IsDefined()
  @IsNotEmpty()
  title: string;

  @IsDefined()
  description: string;
}

export class FeedbackPatches implements IFeedbackPatches {
  @Allow()
  title?: string;

  @Allow()
  description?: string;

  @Allow()
  acknowledged?: boolean;
}

export class AddFeedbackRequest implements IAddFeedbackRequest {
  @Type(() => Feedback)
  @ValidateNested()
  @IsDefined()
  feedback: Feedback;
}

export class PatchFeedbackRequest implements IPatchFeedbackRequest {
  @Type(() => FeedbackPatches)
  @ValidateNested()
  @IsDefined()
  feedback: FeedbackPatches;
}
