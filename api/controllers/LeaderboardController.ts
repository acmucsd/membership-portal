import { UseBefore, JsonController, Get, QueryParams } from 'routing-controllers';
import { Inject } from 'typedi';
import { GetLeaderboardResponse } from 'types';
import { UserAuthentication } from '../middleware/UserAuthentication';
import UserAccountService from '../../services/UserAccountService';
import { SlidingLeaderboardQueryParams } from '../validators/LeaderboardControllerRequests';

@UseBefore(UserAuthentication)
@JsonController('/leaderboard')
export class LeaderboardController {
  @Inject()
  private userAccountService: UserAccountService;

  @Get()
  async getLeaderboard(@QueryParams() filters: SlidingLeaderboardQueryParams): Promise<GetLeaderboardResponse> {
    const { from, to, offset, limit } = filters;
    const leaderboard = await this.userAccountService.getLeaderboard(from, to, offset, limit);
    return { error: null, leaderboard };
  }
}
