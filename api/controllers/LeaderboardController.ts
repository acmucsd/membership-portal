import { UseBefore, JsonController, Get } from 'routing-controllers';
import { Inject } from 'typedi';
import { UserAuthentication } from '../middleware/UserAuthentication';
import UserAccountService from '../../services/UserAccountService';

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
