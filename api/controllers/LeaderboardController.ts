import { UseBefore, JsonController, Get } from 'routing-controllers';
import { UserAuthentication } from 'api/middleware/UserAuthentication';
import { Inject } from 'typedi';
import UserAccountService from '@Services/UserAccountService';

@UseBefore(UserAuthentication)
@JsonController('/leaderboard')
export class LeaderboardController {
  @Inject()
  private userAccountService: UserAccountService;

  @Get()
  async getLeaderboard() {
    const leaderboard = await this.userAccountService.getLeaderboard();
    return { error: null, leaderboard };
  }
}
