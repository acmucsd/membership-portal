import {
  JsonController,
  Get,
  UseBefore,
  Post,
  UploadedFile,
  ForbiddenError,
  BadRequestError,
  Patch,
  Body,
  Params,
  Delete,
} from 'routing-controllers';
import * as path from 'path';
import PermissionsService from '../../services/PermissionsService';
import StorageService from '../../services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import ResumeService from '../../services/ResumeService';
import { UserModel } from '../../models/UserModel';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { File, MediaType, GetVisibleResumesResponse,
  PatchResumeResponse, UpdateResumeResponse, DeleteResumeResponse } from '../../types';
import { PatchResumeRequest, UploadResumeRequest } from '../validators/ResumeControllerRequests';
import { UuidParam } from '../validators/GenericRequests';

@UseBefore(UserAuthentication)
@JsonController('/resume')
export class ResumeController {
  private resumeService: ResumeService;

  private storageService: StorageService;

  constructor(resumeService: ResumeService, storageService: StorageService) {
    this.resumeService = resumeService;
    this.storageService = storageService;
  }

  @Post()
  async uploadResume(@UploadedFile('file',
    { options: StorageService.getFileOptions(MediaType.RESUME) }) file: File,
    @Body() uploadResumeRequest: UploadResumeRequest,
    @AuthenticatedUser() user: UserModel): Promise<UpdateResumeResponse> {
    if (path.extname(file.originalname) !== '.pdf') throw new BadRequestError('Filetype must be \'.pdf\'');

    const oldResume = await this.resumeService.getUserResume(user);
    if (oldResume) await this.storageService.deleteAtUrl(oldResume.url);

    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const url = await this.storageService.uploadToFolder(file, MediaType.RESUME, fileName, user.uuid);
    const resume = await this.resumeService.updateResume(user, url, uploadResumeRequest.isResumeVisible);

    return { error: null, resume: resume.getPublicResume() };
  }

  @UseBefore(UserAuthentication)
  @Patch('/:uuid')
  async patchResume(@Params() params: UuidParam,
    @Body() patchResumeRequest: PatchResumeRequest,
    @AuthenticatedUser() user: UserModel): Promise<PatchResumeResponse> {
    const resume = await this.resumeService.patchResume(params.uuid, patchResumeRequest.resume, user);
    return { error: null, resume: resume.getPublicResume() };
  }

  @Get()
  async getAllVisibleResumes(@AuthenticatedUser() user: UserModel): Promise<GetVisibleResumesResponse> {
    if (!PermissionsService.canSeeAllVisibleResumes(user)) throw new ForbiddenError();
    const resumes = await this.resumeService.getVisibleResumes();
    return { error: null, resumes: resumes.map((resume) => resume.getPublicResume()) };
  }

  @Delete('/:uuid')
  async deleteResume(@Params() params: UuidParam, @AuthenticatedUser() user: UserModel): Promise<DeleteResumeResponse> {
    const resume = await this.resumeService.deleteResume(params.uuid, user);
    await this.storageService.deleteAtUrl(resume.url);
    return { error: null };
  }
}
