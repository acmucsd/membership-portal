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

  public async getLeaderboard(from?: number, to?: number): Promise<PublicProfile[]> {
    const users = await this.entityManager.transaction(async (txn) => {
      // if bounds are in the possible range, round to the nearest day, else null
      // where possible range is from earliest recorded points to current day
      const earliest = await Repositories.activity(txn).getEarliestTimestamp();
      if (from) from = from > earliest ? moment(from).startOf('day').valueOf() : null;
      if (to) to = to <= moment().startOf('day').unix() ? moment(to).endOf('day').valueOf() : null;
      const leaderboardRepository = Repositories.leaderboard(txn);

      // if unbounded, i.e. all-time
      if (!from && !to) {
        return leaderboardRepository.getLeaderboard();
      }

      // if only left bounded, i.e. since some time
      if (from && !to) {
        return leaderboardRepository.getLeaderboardSince(from);
      }

      // if right bounded, i.e. until some time
      if (!from) from = earliest;
      return leaderboardRepository.getLeaderboardUntil(from, to);
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
