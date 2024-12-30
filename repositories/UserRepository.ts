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
      if (changes) user = this.merge(user, changes) as UserModel;
      return this.save(user);
    },

    async findAll(): Promise<UserModel[]> {
      return this.find();
    },

    async findByUuid(uuid: Uuid): Promise<UserModel> {
      return this.findOne({ where: { uuid } });
    },

    async findByHandle(handle: string): Promise<UserModel> {
      return this.findOne({ where: { handle } });
    },

    async isHandleTaken(handle: string): Promise<boolean> {
      const profile = await this.findByHandle(handle);
      return profile !== null;
    },

    async isEmailInUse(email: string): Promise<boolean> {
      const user = await this.findByEmail(email);
      return user !== null;
    },

    async findByEmail(email: string): Promise<UserModel> {
      return this.findOne({ where: { email: email } });
    },

    async findByEmails(emails: string[]): Promise<UserModel[]> {
      return this.find({
        where: { email: In(emails) },
      });
    },

    async findByAccessCode(accessCode: string): Promise<UserModel> {
      return this.findOne({ where: { accessCode } });
    },

    async getAllNamesAndEmails(): Promise<NameAndEmail[]> {
      const namesAndEmailsRaw = await this
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
      return this.save(user);
    },

    async addPointsToMany(users: UserModel[], points: number) {
      users.forEach((user) => {
        user.points += points;
        user.credits += points * 100;
      });
      return this.save(users);
    },

    async addPointsByActivities(activities: Activity[]) {
      const users: UserModel[] = [];
      activities.forEach((activity) => {
        const { user, pointsEarned } = activity;
        user.points += pointsEarned;
        user.credits += pointsEarned * 100;
        users.push(user);
      });
      return this.save(users);
    },

    async addPointsToAll(points: number) {
      return this.createQueryBuilder()
        .update()
        .set({
          points: () => `points + ${points}`,
          credits: () => `credits + ${points * 100}`,
        })
        .execute();
    },

    async getUserInfoAndAccessTypes() {
      const profiles = await this
        .createQueryBuilder()
        .select(['uuid', 'handle', 'email', 'UserModel.firstName', 'UserModel.lastName', 'UserModel.accessType'])
        .getRawMany();
      return profiles;
    },

  });
