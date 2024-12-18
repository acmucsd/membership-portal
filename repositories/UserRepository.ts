import { DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import Container from 'typedi';
import { Activity } from '../types/internal';
import { UserModel } from '../models/UserModel';
import { Uuid, NameAndEmail } from '../types';

const SALT_ROUNDS = 10;

export const UserRepository = Container.get(DataSource)
  .getRepository(UserModel)
  .extend({
    async upsertUser(user: UserModel, changes?: Partial<UserModel>): Promise<UserModel> {
      if (changes) user = this.repository.merge(user, changes) as UserModel;
      return this.repository.save(user);
    },

    async findAll(): Promise<UserModel[]> {
      return this.repository.find();
    },

    async findByUuid(uuid: Uuid): Promise<UserModel> {
      return this.repository.findOne({ uuid });
    },

    async findByHandle(handle: string): Promise<UserModel> {
      return this.repository.findOne({ handle });
    },

    async isHandleTaken(handle: string): Promise<boolean> {
      const profile = await this.findByHandle(handle);
      return profile !== undefined;
    },

    async findByEmail(email: string): Promise<UserModel> {
      return this.repository.findOne({ email });
    },

    async findByEmails(emails: string[]): Promise<UserModel[]> {
      return this.repository.find({
        email: In(emails),
      });
    },

    async isEmailInUse(email: string): Promise<boolean> {
      const user = await this.findByEmail(email);
      return user !== undefined;
    },

    async findByAccessCode(accessCode: string): Promise<UserModel> {
      return this.repository.findOne({ accessCode });
    },

    async getAllNamesAndEmails(): Promise<NameAndEmail[]> {
      const namesAndEmailsRaw = await this.repository
        .createQueryBuilder()
        .select(['email', 'UserModel.firstName', 'UserModel.lastName'])
        .getRawMany();
      const namesAndEmailsFormatted: NameAndEmail[] = namesAndEmailsRaw.map((nameAndEmailRaw) => ({ firstName:
        nameAndEmailRaw.UserModel_firstName,
      lastName: nameAndEmailRaw.UserModel_lastName,
      email: nameAndEmailRaw.email }));
      return namesAndEmailsFormatted;
    },

    async generateHash(pass: string): Promise<string> {
      return bcrypt.hash(pass, SALT_ROUNDS);
    },

    async addPoints(user: UserModel, points: number) {
      user.points += points;
      user.credits += points * 100;
      return this.repository.save(user);
    },

    async addPointsToMany(users: UserModel[], points: number) {
      users.forEach((user) => {
        user.points += points;
        user.credits += points * 100;
      });
      return this.repository.save(users);
    },

    async addPointsByActivities(activities: Activity[]) {
      const users: UserModel[] = [];
      activities.forEach((activity) => {
        const { user, pointsEarned } = activity;
        user.points += pointsEarned;
        user.credits += pointsEarned * 100;
        users.push(user);
      });
      return this.repository.save(users);
    },

    async addPointsToAll(points: number) {
      return this.repository.createQueryBuilder()
        .update()
        .set({
          points: () => `points + ${points}`,
          credits: () => `credits + ${points * 100}`,
        })
        .execute();
    },

    async getUserInfoAndAccessTypes() {
      const profiles = await this.repository
        .createQueryBuilder()
        .select(['uuid', 'handle', 'email', 'UserModel.firstName', 'UserModel.lastName', 'UserModel.accessType'])
        .getRawMany();
      return profiles;
    },

  });
