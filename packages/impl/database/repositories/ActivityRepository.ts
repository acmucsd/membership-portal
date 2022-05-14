import { EntityRepository, Raw } from 'typeorm';
import * as moment from 'moment';
import { ActivityScope, ActivityType, Uuid } from '@acmucsd/membership-portal-types';
import { UserModel } from '../models/UserModel';
import { ActivityModel } from '../models/ActivityModel';
import { BaseRepository } from './BaseRepository';
import { Activity, ActivityTypeToScope } from '../../types';

@EntityRepository(ActivityModel)
export class ActivityRepository extends BaseRepository<ActivityModel> {
  public async logActivity(activity: Activity): Promise<ActivityModel> {
    activity.scope = ActivityTypeToScope[activity.type];
    return this.repository.save(ActivityModel.create(activity));
  }

  public async logActivityBatch(activities: Activity[]): Promise<ActivityModel[]> {
    const activityModels = activities.map((activity) => {
      activity.scope = ActivityTypeToScope[activity.type];
      return ActivityModel.create(activity);
    });
    return this.repository.save(activityModels);
  }

  public async logMilestone(description: string, pointsEarned: number): Promise<void> {
    const scope = ActivityTypeToScope[ActivityType.MILESTONE];
    return this.repository.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "scope") '
      + `SELECT uuid, '${ActivityType.MILESTONE}', '${description}', '${pointsEarned}', '${scope}' `
      + 'FROM "Users"',
    );
  }

  public async logBonus(users: UserModel[], description: string, pointsEarned: number): Promise<void> {
    const scope = ActivityTypeToScope[ActivityType.BONUS_POINTS];
    const uuids = users.map((user) => `'${user.uuid}'`);
    return this.repository.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "scope") '
      + `SELECT uuid, '${ActivityType.BONUS_POINTS}', '${description}', '${pointsEarned}', '${scope}' `
      + `FROM "Users" WHERE uuid IN (${uuids})`,
    );
  }

  public async getCurrentUserActivityStream(user: Uuid): Promise<ActivityModel[]> {
    return this.repository.find({
      where: {
        user,
        scope: Raw((scope) => `${scope} = '${ActivityScope.PUBLIC}' OR ${scope} = '${ActivityScope.PRIVATE}'`),
      },
      order: { timestamp: 'ASC' },
    });
  }

  public async getUserActivityStream(user: Uuid): Promise<ActivityModel[]> {
    return this.repository.find({
      where: {
        user,
        scope: ActivityScope.PUBLIC,
      },
      order: { timestamp: 'ASC' },
    });
  }

  public async getEarliestTimestamp(): Promise<number> {
    const earliestPointsRecord = await this.repository.createQueryBuilder()
      .select('MIN("timestamp")', 'timestamp')
      .where('"pointsEarned" > 0')
      .cache('earliest_recorded_points', moment.duration(1, 'day').asMilliseconds())
      .getRawOne();
    return moment(earliestPointsRecord.timestamp).valueOf();
  }
}
