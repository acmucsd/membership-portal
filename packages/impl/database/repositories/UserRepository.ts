import { EntityRepository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Activity } from '../types/internal';
import { UserModel } from '../models/UserModel';
import { Uuid } from '../types';
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

  public async getAllEmails(): Promise<string[]> {
    const emailsRaw = await this.repository
      .createQueryBuilder()
      .select('email')
      .getRawMany();
    return emailsRaw.map((emailRaw) => emailRaw.email);
  }

  public static async generateHash(pass: string): Promise<string> {
    return bcrypt.hash(pass, this.SALT_ROUNDS);
  }

  public async addPoints(user: UserModel, points: number) {
    user.points += points;
    user.credits += points * 100;
    return this.repository.save(user);
  }

  public async addPointsToMany(users: UserModel[], points: number) {
    users.forEach((user) => {
      user.points += points;
      user.credits += points * 100;
    });
    return this.repository.save(users);
  }

  public async addPointsByActivities(activities: Activity[]) {
    const users: UserModel[] = [];
    activities.forEach((activity) => {
      const { user, pointsEarned } = activity;
      user.points += pointsEarned;
      user.credits += pointsEarned * 100;
      users.push(user);
    });
    return this.repository.save(users);
  }

  public async addPointsToAll(points: number) {
    return this.repository.createQueryBuilder()
      .update()
      .set({
        points: () => `points + ${points}`,
        credits: () => `credits + ${points * 100}`,
      })
      .execute();
  }
}
