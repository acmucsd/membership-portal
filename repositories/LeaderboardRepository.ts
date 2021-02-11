import { EntityRepository, Not, Raw } from 'typeorm';
import * as moment from 'moment';
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
      .innerJoinAndMapMany(
        'usr.total',
        (qb) => qb.subQuery()
          .select('"user"')
          .addSelect('sum("pointsEarned")', 'points')
          .from(ActivityModel, 'activity')
          .where('"pointsEarned" > 0')
          .andWhere('"timestamp" >= :from')
          .groupBy('"user"')
          .orderBy('points', 'DESC')
          .skip(offset)
          .take(limit),
        'totals',
        'usr.uuid = totals.user',
      )
      .setParameter('from', new Date(from))
      .where(`NOT "accessType" = '${UserAccessType.ADMIN}'`)
      .andWhere(`NOT state = '${UserState.BLOCKED}'`)
      .andWhere(`NOT state = '${UserState.PENDING}'`)
      .orderBy('points', 'DESC')
      .getRawAndEntities();
    const userPoints = new Map(users.raw.map((u) => [u.usr_uuid, Number(u.points)]));
    return users.entities.map((u) => this.repository.merge(u, { points: userPoints.get(u.uuid) }));
  }

  public async getLeaderboardUntil(from: number, to: number, offset: number, limit: number) {
    const users = await this.repository.createQueryBuilder('usr')
    // subquery that returns a users' UUIDs and point totals for the timeframe
      .innerJoinAndMapMany(
        'usr.total',
        (qb) => qb.subQuery()
          .select('"user"')
          .addSelect('sum("pointsEarned")', 'points')
          .from(ActivityModel, 'activity')
          .where('"pointsEarned" > 0')
          .andWhere('"timestamp" >= :from')
          .andWhere('"timestamp" <= :to')
          .groupBy('"user"')
          .orderBy('points', 'DESC')
          .skip(offset)
          .take(limit),
        'totals',
        'usr.uuid = totals.user',
      )
      .setParameter('from', new Date(from))
      .setParameter('to', new Date(to))
      .where(`NOT "accessType" = '${UserAccessType.ADMIN}'`)
      .andWhere(`NOT state = '${UserState.BLOCKED}'`)
      .andWhere(`NOT state = '${UserState.PENDING}'`)
      .orderBy('points', 'DESC')
      .cache(`leaderboard_${from}_${to}`, moment.duration(1, 'hour').asMilliseconds())
      .getRawAndEntities();
    const userPoints = new Map(users.raw.map((u) => [u.usr_uuid, Number(u.points)]));
    return users.entities.map((u) => this.repository.merge(u, { points: userPoints.get(u.uuid) }));
  }
}
