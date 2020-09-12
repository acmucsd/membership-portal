import { EntityRepository, Not, In, Raw } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserModel } from '../models/UserModel';
import { Uuid, UserState, UserAccessType } from '../types';
import { BaseRepository } from './BaseRepository';

@EntityRepository(UserModel)
export class UserRepository extends BaseRepository<UserModel> {
  private static readonly SALT_ROUNDS = 10;

  public async upsertUser(user: UserModel, changes?: Partial<UserModel>): Promise<UserModel> {
    if (changes) user = UserModel.merge(user, changes);
    return this.repository.save(user);
  }

  public async findAll(): Promise<UserModel[]> {
    return this.repository.find();
  }

  public async findByUuid(uuid: Uuid): Promise<UserModel> {
    return this.repository.findOne({ uuid });
  }

  public async findByEmail(email: string): Promise<UserModel> {
    return this.repository.findOne({ email });
  }

  public async findByEmails(emails: string[]): Promise<UserModel[]> {
    return this.repository.find({
      email: In(emails),
    });
  }

  public async findByAccessCode(accessCode: string): Promise<UserModel> {
    return this.repository.findOne({ accessCode });
  }

  public static generateAccessCode(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public async changeAccessCode(user: UserModel): Promise<UserModel> {
    user.accessCode = UserRepository.generateAccessCode();
    return this.repository.save(user);
  }

  public async setStateToPasswordReset(user: UserModel): Promise<UserModel> {
    user.accessCode = UserRepository.generateAccessCode();
    user.state = UserState.PASSWORD_RESET;
    return this.repository.save(user);
  }

  public async getLeaderboard(offset = 0, limit = 1000): Promise<UserModel[]> {
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

  public static async generateHash(pass: string): Promise<string> {
    return bcrypt.hash(pass, this.SALT_ROUNDS);
  }

  public async addPoints(user: UserModel, points: number) {
    return this.repository.increment(user, 'points', points);
  }

  public async addPointsToMany(users: UserModel[], points: number) {
    return this.repository.createQueryBuilder()
      .update()
      .set({ points: () => `points + ${points}` })
      .where(users)
      .execute();
  }

  public async addPointsToAll(points: number) {
    return this.repository.createQueryBuilder()
      .update()
      .set({ points: () => `points + ${points}` })
      .execute();
  }
}
