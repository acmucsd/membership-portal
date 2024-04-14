import { UseBefore, JsonController, Get, QueryParams } from 'routing-controllers';
import { GetLeaderboardResponse } from '../../types';
import { UserAuthentication } from '../middleware';
import { UserAccountService } from '../../services';
import { SlidingLeaderboardQueryParams } from '../validators';

@UseBefore(UserAuthentication)
@JsonController('/leaderboard')
export class LeaderboardController {
  private userAccountService: UserAccountService;

  constructor(userAccountService: UserAccountService) {
    this.userAccountService = userAccountService;
  }

  @Get()
  async getLeaderboard(@QueryParams() filters: SlidingLeaderboardQueryParams): Promise<GetLeaderboardResponse> {
    const { from, to, offset, limit } = filters;
    const leaderboard = await this.userAccountService.getLeaderboard(from, to, offset, limit);
    return { error: null, leaderboard };
  }
}
