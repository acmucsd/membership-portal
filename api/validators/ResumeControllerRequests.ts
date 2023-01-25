import { Type } from 'class-transformer';
import { IsBoolean, IsBooleanString, IsDefined, ValidateNested } from 'class-validator';
import {
  UploadResumeRequest as IUploadResumeRequest,
  ResumePatches as IResumePatches,
  PatchResumeRequest as IPatchResumeRequest,
} from '../../types';

export class UploadResumeRequest implements IUploadResumeRequest {
  // IsBooleanString is used here instead of IsBoolean since multipart/form-data
  // field types are all string or files (no boolean types)
  @IsBooleanString()
  isResumeVisible: boolean;
}

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
