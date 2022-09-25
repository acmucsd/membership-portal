import { JsonController, UseBefore, Post, UploadedFile, BadRequestError } from 'routing-controllers';
import path = require('path');
import StorageService from '../../services/StorageService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import ResumeService from '../../services/ResumeService';
import { UserModel } from '../../models/UserModel';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { File, MediaType, UpdateResumeResponse } from '../../types';

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
  async updateResume(@UploadedFile('file',
    { options: StorageService.getFileOptions(MediaType.RESUME) }) file: File,
    @AuthenticatedUser() user: UserModel): Promise<UpdateResumeResponse> {
    if (path.extname(file.originalname) !== '.pdf') throw new BadRequestError('Filetype must be \'.pdf\'');

    const oldResumes = await this.resumeService.getUserResumes(user);
    await this.storageService.deleteAtUrls(oldResumes.map((resume) => resume.url));

    const fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.'));
    const url = await this.storageService.uploadToFolder(file, MediaType.RESUME, fileName, user.uuid);
    const model = await this.resumeService.updateResume(user, url);

    return { error: null, resume: model };
  }
}
