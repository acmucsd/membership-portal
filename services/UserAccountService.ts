import { BadRequestError, NotFoundError } from 'routing-controllers';
import { Service } from 'typedi';
import { InjectManager } from 'typeorm-typedi-extensions';
import { EntityManager } from 'typeorm';
import Repositories from '../repositories';
import {
  Uuid,
  CreateMilestoneRequest,
  PublicProfile,
  ActivityType,
  PatchUserRequest,
  PublicActivity,
  RegistrationRequest,
} from '../types';
import { UserRepository } from '../repositories/UserRepository';
import { UserModel } from '../models/UserModel';

@Service()
export default class UserAccountService {
  @InjectManager()
  private entityManager: EntityManager;

  public async registerUser(registrationRequest: RegistrationRequest): Promise<UserModel> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.upsertUser(UserModel.create({
        ...registrationRequest,
        hash: await UserRepository.generateHash(registrationRequest.password),
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

  public async getLeaderboard(): Promise<PublicProfile[]> {
    const users = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.getLeaderboard();
    });
    return users.map((u) => u.getPublicProfile());
  }

  public async update(user: UserModel, patchUserRequest: PatchUserRequest): Promise<UserModel> {
    const changes: Partial<UserModel> = patchUserRequest;
    if (patchUserRequest.passwordChange) {
      const { password: currentPassword, newPassword } = patchUserRequest.passwordChange;
      if (!(await user.verifyPass(currentPassword))) {
        throw new BadRequestError('Incorrect password');
      }
      changes.hash = await UserRepository.generateHash(newPassword);
    }
    return this.entityManager.transaction(async (txn) => {
      const activityRepository = Repositories.activity(txn);
      const updatedFields = Object.keys(patchUserRequest).join(', ');
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

  public async createMilestone(milestone: CreateMilestoneRequest): Promise<void> {
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
