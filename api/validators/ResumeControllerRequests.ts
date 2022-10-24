import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, ValidateNested } from 'class-validator';
import {
  ResumePatches as IResumePatches,
  PatchResumeRequest as IPatchResumeRequest,
} from '../../types';

export class ResumePatches implements IResumePatches {
  @IsBoolean()
  isResumeVisible?: boolean;
}

export class PatchResumeRequest implements IPatchResumeRequest {
  @Type(() => ResumePatches)
  @ValidateNested()
  @IsDefined()
  resume: ResumePatches;
}
