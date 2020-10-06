import { EntityRepository } from 'typeorm';
import * as moment from 'moment';
import { ActivityType, Uuid } from '../types';
import { UserModel } from '../models/UserModel';
import { ActivityModel } from '../models/ActivityModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ActivityModel)
export class ActivityRepository extends BaseRepository<ActivityModel> {
  private static publicActivities = new Set([
    ActivityType.ACCOUNT_CREATE,
    ActivityType.ATTEND_EVENT,
    ActivityType.ATTEND_EVENT_AS_STAFF,
    ActivityType.BONUS_POINTS,
    ActivityType.MILESTONE,
  ]);

  public async logActivity(
    user: UserModel, type: ActivityType, pointsEarned?: number, description?: string,
  ): Promise<ActivityModel> {
    const activity = {
      user,
      type,
      description,
      pointsEarned,
      public: ActivityRepository.isPublicActivityType(type),
    };
    return this.repository.save(ActivityModel.create(activity));
  }

  public async logMilestone(description: string, pointsEarned: number): Promise<void> {
    return this.repository.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "public") '
      + `SELECT uuid, '${ActivityType.MILESTONE}', '${description}', '${pointsEarned}', 'true' `
      + 'FROM "Users"',
    );
  }

  public async logBonus(users: UserModel[], description: string, pointsEarned: number): Promise<void> {
    const uuids = users.map((user) => `'${user.uuid}'`);
    return this.repository.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "public") '
      + `SELECT uuid, '${ActivityType.BONUS_POINTS}', '${description}', '${pointsEarned}', 'true' `
      + `FROM "Users" WHERE uuid IN (${uuids})`,
    );
  }

  public async getUserActivityStream(user: Uuid): Promise<ActivityModel[]> {
    return this.repository.find({
      where: { user, public: true },
      order: { timestamp: 'ASC' },
    });
  }

  public async getEarliestTimestamp(): Promise<number> {
    const earliestPointsRecord = await this.repository.createQueryBuilder()
      .select('MIN("timestamp")', 'timestamp')
      .where('public = true AND "pointsEarned" > 0')
      .cache('earliest_recorded_points', moment.duration(1, 'day').asMilliseconds())
      .getRawOne();
    return moment(earliestPointsRecord.timestamp).valueOf();
  }

  private static isPublicActivityType(type: ActivityType): boolean {
    return ActivityRepository.publicActivities.has(type);
  }
}
