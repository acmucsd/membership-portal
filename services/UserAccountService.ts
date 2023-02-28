import { BadRequestError, NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { EntityManager } from 'typeorm';
import * as moment from 'moment';
import Repositories, { TransactionsManager } from '../repositories';
import {
  Uuid,
  PublicProfile,
  ActivityType,
  PublicActivity,
  Milestone,
  UserPatches,
  UserState,
  PrivateProfile,
} from '../types';
import { UserRepository } from '../repositories/UserRepository';
import { UserModel } from '../models/UserModel';

@Service()
export default class UserAccountService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async findByUuid(uuid: Uuid): Promise<UserModel> {
    const user = await this.transactions.readOnly(async (txn) => Repositories
      .user(txn)
      .findByUuid(uuid));
    if (!user) throw new NotFoundError('User was not found');
    return user;
  }

  public async verifyEmail(accessCode: string): Promise<void> {
    await this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByAccessCode(accessCode);
      if (!user) throw new NotFoundError();
      userRepository.upsertUser(user, { state: UserState.ACTIVE });
    });
  }

  public async getLeaderboard(from?: number, to?: number, offset = 0, limit = 100): Promise<PublicProfile[]> {
    // convert timestamps from seconds to milliseconds
    if (from) from *= 1000;
    if (to) to *= 1000;

    const users = await this.transactions.readOnly(async (txn) => {
      // if each bound is in the possible range, round it to the nearest day, else null
      // where the possible range is from the earliest recorded points to the current day
      const earliest = await Repositories.activity(txn).getEarliestTimestamp();
      // if left bound is after the earliest recorded points, round to the start of the day
      if (from) from = from > earliest ? moment(from).startOf('day').valueOf() : null;
      // if right bound is before the current day, round to the end of the day
      if (to) to = to <= moment().startOf('day').valueOf() ? moment(to).endOf('day').valueOf() : null;
      const leaderboardRepository = Repositories.leaderboard(txn);

      // if unbounded, i.e. all-time
      if (!from && !to) {
        return leaderboardRepository.getLeaderboard(offset, limit);
      }

      // if only left bounded, i.e. since some time
      if (from && !to) {
        return leaderboardRepository.getLeaderboardSince(from, offset, limit);
      }

      // if right bounded, i.e. until some time
      if (!from) from = moment(earliest).startOf('day').valueOf();
      return leaderboardRepository.getLeaderboardUntil(from, to, offset, limit);
    });
    return users.map((u) => u.getPublicProfile());
  }

  public async update(user: UserModel, userPatches: UserPatches): Promise<UserModel> {
    const changes: Partial<UserModel> = userPatches;
    if (userPatches.passwordChange) {
      const { password: currentPassword, newPassword } = userPatches.passwordChange;
      if (!(await user.verifyPass(currentPassword))) {
        throw new BadRequestError('Incorrect password');
      }
      changes.hash = await UserRepository.generateHash(newPassword);
    }
    return this.transactions.readWrite(async (txn) => {
      const updatedFields = Object.keys(userPatches).join(', ');
      const activity = {
        user,
        type: ActivityType.ACCOUNT_UPDATE_INFO,
        description: updatedFields,
      };
      await Repositories
        .activity(txn)
        .logActivity(activity);
      return Repositories.user(txn).upsertUser(user, changes);
    });
  }

  public async updateProfilePicture(user: UserModel, profilePicture: string): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => Repositories
      .user(txn)
      .upsertUser(user, { profilePicture }));
  }

  public async getCurrentUserActivityStream(uuid: Uuid): Promise<PublicActivity[]> {
    const stream = await this.transactions.readOnly(async (txn) => Repositories
      .activity(txn)
      .getCurrentUserActivityStream(uuid));
    return stream.map((activity) => activity.getPublicActivity());
  }

  public async getUserActivityStream(uuid: Uuid): Promise<PublicActivity[]> {
    const activityStream = await this.transactions.readOnly(async (txn) => {
      const user = await this.findByUuid(uuid);
      return Repositories.activity(txn).getUserActivityStream(user.uuid);
    });
    return activityStream.map((activity) => activity.getPublicActivity());
  }

  public async createMilestone(milestone: Milestone): Promise<void> {
    return this.transactions.readWrite(async (txn) => {
      await Repositories.user(txn).addPointsToAll(milestone.points);
      await Repositories.activity(txn).logMilestone(milestone.name, milestone.points);
    });
  }

  public async grantBonusPoints(emails: string[], description: string, points: number) {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      const users = await userRepository.findByEmails(emails);
      const emailsFound = users.map((user) => user.email);
      const emailsNotFound = emails.filter((email) => !emailsFound.includes(email));

      if (emailsNotFound.length > 0) {
        throw new BadRequestError(`Couldn't find accounts matching these emails: ${JSON.stringify(emailsNotFound)}`);
      }

      await userRepository.addPointsToMany(users, points);
      return Repositories.activity(txn).logBonus(users, description, points);
    });
  }

  public async getAllEmails(): Promise<string[]> {
    return this.transactions.readOnly(async (txn) => Repositories
      .user(txn)
      .getAllEmails());
  }

  /**
   * UserAccountService::getFullUserProfile() differs from UserModel::getFullUserProfile() in that it also returns any
   * user data that needs to be joined from other tables (e.g. resumes and social media URLs)
   */
  public async getFullUserProfile(user: UserModel) : Promise<PrivateProfile> {
    return this.transactions.readOnly(async (txn) => {
      const userProfile = user.getFullUserProfile();
      userProfile.resumes = await Repositories.resume(txn).findAllByUser(user);
      userProfile.userSocialMedia = await Repositories.userSocialMedia(txn).getSocialMediaForUser(user);
      return userProfile;
    });
  }

  public async getPublicProfile(user: UserModel) : Promise<PublicProfile> {
    return this.transactions.readOnly(async (txn) => {
      const userProfile = user.getPublicProfile();
      userProfile.userSocialMedia = await Repositories.userSocialMedia(txn).getSocialMediaForUser(user);
      return userProfile;
    });
  }
}
