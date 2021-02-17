import { EntityRepository, Raw } from 'typeorm';
import * as moment from 'moment';
import { ActivityScope, ActivityType, Uuid } from '../types';
import { UserModel } from '../models/UserModel';
import { ActivityModel } from '../models/ActivityModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ActivityModel)
export class ActivityRepository extends BaseRepository<ActivityModel> {
  private static activityScopes = {
    [ActivityType.ACCOUNT_CREATE]: ActivityScope.PUBLIC,
    [ActivityType.ATTEND_EVENT]: ActivityScope.PUBLIC,
    [ActivityType.ATTEND_EVENT_AS_STAFF]: ActivityScope.PUBLIC,
    [ActivityType.BONUS_POINTS]: ActivityScope.PUBLIC,
    [ActivityType.MILESTONE]: ActivityScope.PUBLIC,
    [ActivityType.FEEDBACK_ACKNOWLEDGED]: ActivityScope.PRIVATE,
    [ActivityType.ORDER_MERCHANDISE]: ActivityScope.PRIVATE,
    [ActivityType.SUBMIT_EVENT_FEEDBACK]: ActivityScope.PRIVATE,
    [ActivityType.SUBMIT_FEEDBACK]: ActivityScope.PRIVATE,
    [ActivityType.ACCOUNT_ACTIVATE]: ActivityScope.HIDDEN,
    [ActivityType.ACCOUNT_LOGIN]: ActivityScope.HIDDEN,
    [ActivityType.ACCOUNT_RESET_PASS]: ActivityScope.HIDDEN,
    [ActivityType.ACCOUNT_RESET_PASS_REQUEST]: ActivityScope.HIDDEN,
    [ActivityType.ACCOUNT_UPDATE_INFO]: ActivityScope.HIDDEN,
  };

  public async logActivity(
    user: UserModel, type: ActivityType, pointsEarned?: number, description?: string,
  ): Promise<ActivityModel> {
    const activity = {
      user,
      type,
      description,
      pointsEarned,
      scope: ActivityRepository.activityScopes[type],
    };
    return this.repository.save(ActivityModel.create(activity));
  }

  public async logMilestone(description: string, pointsEarned: number): Promise<void> {
    const scope = ActivityRepository.activityScopes[ActivityType.MILESTONE];
    return this.repository.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "scope") '
      + `SELECT uuid, '${ActivityType.MILESTONE}', '${description}', '${pointsEarned}', '${scope}' `
      + 'FROM "Users"',
    );
  }

  public async logBonus(users: UserModel[], description: string, pointsEarned: number): Promise<void> {
    const scope = ActivityRepository.activityScopes[ActivityType.BONUS_POINTS];
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
