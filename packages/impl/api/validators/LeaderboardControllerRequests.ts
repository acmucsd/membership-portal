import { Min } from 'class-validator';
import { SlidingLeaderboardQueryParams as ISlidingLeaderboardQueryParams } from '@acmucsd/membership-portal-types';
import { Pagination } from './GenericRequests';

export class SlidingLeaderboardQueryParams extends Pagination implements ISlidingLeaderboardQueryParams {
  @Min(0)
  from?: number;

  @Min(0)
  to?: number;
}
