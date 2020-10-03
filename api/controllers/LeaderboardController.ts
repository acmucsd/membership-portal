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
  async getLeaderboard(@QueryParams() timeframe: SlidingLeaderboardQueryParams): Promise<GetLeaderboardResponse> {
    const leaderboard = await this.userAccountService.getLeaderboard(timeframe.from, timeframe.to);
    return { error: null, leaderboard };
  }
}
