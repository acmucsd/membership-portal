import { UserAuthentication } from '../middleware/UserAuthentication';
import { JsonController, Params, Get, UseBefore } from 'routing-controllers';
import ResumeService from '../../services/ResumeService';
import { UserModel } from '../../models/UserModel';
import { UuidParam } from '../validators/GenericRequests';
import { AuthenticatedUser } from '../decorators/AuthenticatedUser';
import { GetResumesListResponse } from '../../types';
import PermissionsService from 'services/PermissionsService';

@UseBefore(UserAuthentication)
@JsonController('/resume')
export class ResumeController {
  private resumeService: ResumeService;

  constructor(resumeService: ResumeService) {
    this.resumeService = resumeService;
  }

  @Get()
  async getAllVisibleResumes(@Params() params: UuidParam,
    @AuthenticatedUser() currentUser: UserModel): Promise<GetResumesListResponse> {
    const resumes = await this.resumeService.getVisibleResumes(PermissionsService.canSeeAllVisibleResumes(currentUser));
    return { error: null, resumes };
  }
}
