import { EntityRepository } from 'typeorm';
import { UserModel } from '@Models/UserModel';
import { ActivityType, Uuid } from 'types';
import { ActivityModel } from '@Models/ActivityModel';
import { BaseRepository } from './BaseRepository';

@EntityRepository(ActivityModel)
export class ActivityRepository extends BaseRepository<ActivityModel> {
  private static publicActivityTypes = [
    ActivityType.ACCOUNT_CREATE,
    ActivityType.ATTEND_EVENT,
    ActivityType.ATTEND_EVENT_AS_STAFF,
    ActivityType.BONUS_POINTS,
    ActivityType.MILESTONE,
  ];

  public async logActivity(
    user: UserModel,
    type: ActivityType,
    pointsEarned?: number,
    description?: string,
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
    return this.manager.query(
      'INSERT INTO "Activities" ("user", "type", "description", "pointsEarned", "public") '
      + `SELECT uuid, '${ActivityType.MILESTONE}', '${description}', '${pointsEarned}', 'true' `
      + 'FROM "Users"',
    );
  }

  public async logBonus(users: UserModel[], description: string, pointsEarned: number): Promise<void> {
    const uuids = users.map((user) => `'${user.uuid}'`);
    return this.manager.query(
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

  private static isPublicActivityType(type: ActivityType): boolean {
    return ActivityRepository.publicActivityTypes.includes(type);
  }
}
