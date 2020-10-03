import { Min } from 'class-validator';
import { SlidingLeaderboardQueryParams as ISlidingLeaderboardQueryParams } from '../../types';

export class SlidingLeaderboardQueryParams implements ISlidingLeaderboardQueryParams {
  @Min(0)
  from?: number;

  @Min(0)
  to?: number;
}
