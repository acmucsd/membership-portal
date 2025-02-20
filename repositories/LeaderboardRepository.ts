import { DataSource, Not, Raw } from 'typeorm';
import Container from 'typedi';
import * as moment from 'moment';
import { Config } from '../config';
import { ActivityModel } from '../models/ActivityModel';
import { UserModel } from '../models/UserModel';
import { UserState } from '../types';

export const LeaderboardRepository = Container.get(DataSource)
  .getRepository(UserModel)
  .extend({
    async getLeaderboard(offset: number, limit: number): Promise<UserModel[]> {
      return this.find({
        skip: offset,
        take: limit,
        where: {
          email: Not(Config.admin.email),
          state: Raw((state) => `NOT ${state} = '${UserState.BLOCKED}' AND NOT ${state} = '${UserState.PENDING}'`),
        },
        order: { points: 'DESC' },
      });
    },

    async getLeaderboardSince(from: number, offset: number, limit: number) {
      const users = await this.createQueryBuilder('usr')
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
        .where(`NOT "email" = '${Config.admin.email}'`)
        .andWhere(`NOT state = '${UserState.BLOCKED}'`)
        .andWhere(`NOT state = '${UserState.PENDING}'`)
        .orderBy('points', 'DESC')
        .getRawAndEntities();
      const userPoints = new Map(users.raw.map((u) => [u.usr_uuid, Number(u.points)]));
      return users.entities.map((u) => this.merge(u, { points: userPoints.get(u.uuid) }));
    },

    async getLeaderboardUntil(from: number, to: number, offset: number, limit: number) {
      const users = await this.createQueryBuilder('usr')
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
        .where(`NOT "email" = '${Config.admin.email}'`)
        .andWhere(`NOT state = '${UserState.BLOCKED}'`)
        .andWhere(`NOT state = '${UserState.PENDING}'`)
        .orderBy('points', 'DESC')
        .cache(`leaderboard_${from}_${to}_${offset}_${limit}`, moment.duration(1, 'hour').asMilliseconds())
        .getRawAndEntities();
      const userPoints = new Map(users.raw.map((u) => [u.usr_uuid, Number(u.points)]));
      return users.entities.map((u) => this.merge(u, { points: userPoints.get(u.uuid) }));
    },
  });
