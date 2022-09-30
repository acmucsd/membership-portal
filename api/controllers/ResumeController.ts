import { JsonController, Params, Get, UseBefore, ForbiddenError } from 'routing-controllers';
import PermissionsService from '../../services/PermissionsService';
import { UserAuthentication } from '../middleware/UserAuthentication';
import ResumeService from '../../services/ResumeService';
import { UserModel } from '../../models/UserModel';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { GetResumesListResponse } from '../../types';

@UseBefore(UserAuthentication)
@JsonController('/resume')
export class ResumeController {
  private resumeService: ResumeService;

  constructor(resumeService: ResumeService) {
    this.resumeService = resumeService;
  } 

  @Get()
  async getAllVisibleResumes(@AuthenticatedUser() currentUser: UserModel): Promise<GetResumesListResponse> {
    if (!PermissionsService.canSeeAllVisibleResumes(currentUser)) throw new ForbiddenError();
    const resumes = await this.resumeService.getVisibleResumes();
    return { error: null, resumes };
  }
}
