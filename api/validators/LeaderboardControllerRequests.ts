import { Min } from 'class-validator';
import { SlidingLeaderboardQueryParams as ISlidingLeaderboardQueryParams } from '@customtypes';
import { Pagination } from '@validators';

export class SlidingLeaderboardQueryParams extends Pagination implements ISlidingLeaderboardQueryParams {
  @Min(0)
  from?: number;

  @Min(0)
  to?: number;
}
