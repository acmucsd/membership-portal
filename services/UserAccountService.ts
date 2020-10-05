import { BadRequestError, NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { EntityManager } from 'typeorm';
import * as moment from 'moment';
import Repositories from '../repositories';
import {
  Uuid,
  PublicProfile,
  ActivityType,
  PublicActivity,
  Milestone,
  UserPatches,
  UserRegistration,
} from '../types';
import { UserRepository } from '../repositories/UserRepository';
import { UserModel } from '../models/UserModel';

@Service()
export default class UserAccountService {
  @InjectManager()
  private entityManager: EntityManager;

  public async registerUser(registration: UserRegistration): Promise<UserModel> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      const emailAlreadyUsed = !!(await userRepository.findByEmail(registration.email));
      if (emailAlreadyUsed) throw new BadRequestError('Email already in use');
      const user = await userRepository.upsertUser(UserModel.create({
        ...registration,
        hash: await UserRepository.generateHash(registration.password),
        accessCode: UserRepository.generateAccessCode(),
      }));
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(user, ActivityType.ACCOUNT_CREATE);
      return user;
    });
  }

  public async findAll(): Promise<UserModel[]> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.findAll();
    });
  }

  public async findByUuid(uuid: Uuid): Promise<UserModel> {
    const user = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.findByUuid(uuid);
    });
    if (!user) throw new NotFoundError();
    return user;
  }

  public async findByEmail(email: string): Promise<UserModel> {
    const user = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.findByEmail(email);
    });
    if (!user) throw new NotFoundError();
    return user;
  }

  public async findByAccessCode(accessCode: string): Promise<UserModel> {
    const user = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.findByAccessCode(accessCode);
    });
    if (!user) throw new NotFoundError();
    return user;
  }

  public async getLeaderboard(from?: number, to?: number, offset = 0, limit = 100): Promise<PublicProfile[]> {
    // convert timestamps from seconds to milliseconds
    if (from) from *= 1000;
    if (to) to *= 1000;

    const users = await this.entityManager.transaction(async (txn) => {
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
    return this.entityManager.transaction(async (txn) => {
      const activityRepository = Repositories.activity(txn);
      const updatedFields = Object.keys(userPatches).join(', ');
      await activityRepository.logActivity(user, ActivityType.ACCOUNT_UPDATE_INFO, 0, updatedFields);
      const userRepository = Repositories.user(txn);
      return userRepository.upsertUser(user, changes);
    });
  }

  public async updateProfilePicture(user: UserModel, profilePicture: string): Promise<UserModel> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.upsertUser(user, { profilePicture });
    });
  }

  public async getUserActivityStream(user: Uuid): Promise<PublicActivity[]> {
    const stream = await this.entityManager.transaction(async (txn) => {
      const activityRepository = Repositories.activity(txn);
      return activityRepository.getUserActivityStream(user);
    });
    return stream.map((activity) => activity.getPublicActivity());
  }

  public async createMilestone(milestone: Milestone): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      await userRepository.addPointsToAll(milestone.points);
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logMilestone(milestone.name, milestone.points);
    });
  }

  public async grantBonusPoints(emails: string[], description: string, points: number) {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      const users = await userRepository.findByEmails(emails);
      if (users.length !== emails.length) {
        throw new BadRequestError('Couldn\'t find accounts matching one or more emails');
      }
      await userRepository.addPointsToMany(users, points);
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logBonus(users, description, points);
    });
  }
}
