import { EntityRepository, Not, Raw } from 'typeorm';
import { ActivityModel } from '../models/ActivityModel';
import { UserModel } from '../models/UserModel';
import { UserAccessType, UserState } from '../types';
import { BaseRepository } from './BaseRepository';

@EntityRepository(UserModel)
export class LeaderboardRepository extends BaseRepository<UserModel> {
  public async getLeaderboard(offset: number, limit: number): Promise<UserModel[]> {
    return this.repository.find({
      skip: offset,
      take: limit,
      where: {
        accessType: Not(UserAccessType.ADMIN),
        state: Raw((state) => `NOT ${state} = '${UserState.BLOCKED}' AND NOT ${state} = '${UserState.PENDING}'`),
      },
      order: { points: 'DESC' },
    });
  }

  public async getLeaderboardSince(from: number, offset: number, limit: number) {
    const users = await this.repository.createQueryBuilder('usr')
      // subquery that returns a users' UUIDs and point totals for the timeframe
      .innerJoin(
        (qb) => qb.subQuery()
          .select('"user"')
          .addSelect('sum("pointsEarned")', 'points')
          .from(ActivityModel, 'activity')
          .groupBy('"user"')
          .where('"timestamp" >= :from'),
        'totals',
        'usr.uuid = totals.user',
      )
      .setParameter('from', new Date(from))
      // overwrites the SELECT the ORM uses to set points in the model
      .addSelect('"totals"."points"', 'usr_points')
      .where(`NOT "accessType" = '${UserAccessType.ADMIN}'`)
      .andWhere(`NOT state = '${UserState.BLOCKED}' AND NOT state = '${UserState.PENDING}'`)
      .orderBy('usr_points', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
    // casts the overwritten 'points' property to an integer
    return users.map((u) => this.repository.merge(u, { points: Number(u.points) }));
  }

  public async getLeaderboardUntil(from: number, to: number, offset: number, limit: number) {
    const users = await this.repository.createQueryBuilder('usr')
      // subquery that returns a users' UUIDs and point totals for the timeframe
      .innerJoin(
        (qb) => qb.subQuery()
          .select('"user"')
          .addSelect('sum("pointsEarned")', 'points')
          .from(ActivityModel, 'activity')
          .groupBy('"user"')
          .where('"timestamp" >= :from AND "timestamp" <= :to'),
        'totals',
        'usr.uuid = totals.user',
      )
      .setParameter('from', new Date(from))
      .setParameter('to', new Date(to))
      // overwrites the SELECT the ORM uses to set points in the model
      .addSelect('"totals"."points"', 'usr_points')
      .where(`NOT "accessType" = '${UserAccessType.ADMIN}'`)
      .andWhere(`NOT state = '${UserState.BLOCKED}' AND NOT state = '${UserState.PENDING}'`)
      .orderBy('usr_points', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();
    // casts the overwritten 'points' property to an integer
    return users.map((u) => this.repository.merge(u, { points: Number(u.points) }));
  }
}
