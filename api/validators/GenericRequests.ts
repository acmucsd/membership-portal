import { Min } from 'class-validator';
import { Pagination as IPagination } from '../../types';

export class Pagination implements IPagination {
  @Min(0)
  offset?: number;

  @Min(0)
  limit?: number;
}
