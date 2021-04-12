import { Service } from 'typedi';
import { ForbiddenError, NotFoundError, BadRequestError } from 'routing-controllers';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { InjectManager } from 'typeorm-typedi-extensions';
import { EntityManager } from 'typeorm';
import { UserRepository } from '../repositories/UserRepository';
import { Uuid, ActivityType, UserState, UserRegistration } from '../types';
import { Config } from '../config';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager } from '../repositories';

interface AuthToken {
  uuid: Uuid;
  admin: boolean;
}

@Service()
export default class UserAuthService {
  private transactions: TransactionsManager;

  constructor(@InjectManager() entityManager: EntityManager) {
    this.transactions = new TransactionsManager(entityManager);
  }

  public async registerUser(registration: UserRegistration): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      const emailAlreadyUsed = !!(await userRepository.findByEmail(registration.email));
      if (emailAlreadyUsed) throw new BadRequestError('Email already in use');
      const user = await userRepository.upsertUser(UserModel.create({
        ...registration,
        hash: await UserRepository.generateHash(registration.password),
        accessCode: UserAuthService.generateAccessCode(),
      }));
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ACCOUNT_CREATE,
      });
      return user;
    });
  }

  public async checkAuthToken(authToken: string): Promise<UserModel> {
    const token = jwt.verify(authToken, Config.auth.secret);
    if (!UserAuthService.isAuthToken(token)) throw new BadRequestError('Invalid auth token');
    const user = await this.transactions.readOnly(async (txn) => Repositories
      .user(txn)
      .findByUuid(token.uuid));
    if (!user) throw new NotFoundError();
    return user;
  }

  public async login(email: string, pass: string): Promise<string> {
    const authenticatedUser = await this.transactions.readWrite(async (txn) => {
      const user = await Repositories
        .user(txn)
        .findByEmail(email.toLowerCase());
      if (!user) throw new NotFoundError('There is no account associated with that email');
      if (user.isBlocked()) throw new ForbiddenError('Your account has been blocked');
      if (!(await user.verifyPass(pass))) throw new ForbiddenError('Incorrect password');
      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.ACCOUNT_LOGIN,
      });
      return user;
    });
    const token: AuthToken = {
      uuid: authenticatedUser.uuid,
      admin: authenticatedUser.isAdmin(),
    };
    return jwt.sign(token, Config.auth.secret, { expiresIn: Config.auth.tokenLifespan });
  }

  public async checkCredentials(email: string, pass: string): Promise<UserModel> {
    const authenticatedUser = await this.transactions.readWrite(async (txn) => {
      const user = await Repositories
        .user(txn)
        .findByEmail(email.toLowerCase());
      if (!user) throw new NotFoundError('There is no account associated with that email');
      const passwordMatched = await user.verifyPass(pass);
      if (!passwordMatched) throw new ForbiddenError('Incorrect password');
      await Repositories.activity(txn).logActivity({
        user,
        type: ActivityType.ACCOUNT_LOGIN,
      });
      return user;
    });
    if (authenticatedUser.isBlocked()) throw new ForbiddenError('Your account has been blocked');
    return authenticatedUser;
  }

  public static generateAuthToken(user: UserModel): string {
    const token: AuthToken = {
      uuid: user.uuid,
      admin: user.isAdmin(),
    };
    return jwt.sign(token, Config.auth.secret, { expiresIn: Config.auth.tokenLifespan });
  }

  public async setAccessCode(email: string): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByEmail(email);
      if (!user) throw new NotFoundError();
      return userRepository.upsertUser(user, { accessCode: UserAuthService.generateAccessCode() });
    });
  }

  public async putAccountInPasswordResetMode(email: string): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      let user = await userRepository.findByEmail(email);
      if (!user) throw new NotFoundError();
      user = await userRepository.upsertUser(user, {
        state: UserState.PASSWORD_RESET,
        accessCode: UserAuthService.generateAccessCode(),
      });
      await Repositories
        .activity(txn)
        .logActivity({
          user,
          type: ActivityType.ACCOUNT_RESET_PASS_REQUEST,
        });
      return user;
    });
  }

  public async resetPassword(accessCode: string, newPassword: string): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByAccessCode(accessCode);
      if (!user) throw new BadRequestError('Invalid access code');

      await userRepository.upsertUser(user, {
        accessCode: null,
        hash: await UserRepository.generateHash(newPassword),
        state: UserState.ACTIVE,
      });

      await Repositories
        .activity(txn)
        .logActivity({
          user,
          type: ActivityType.ACCOUNT_RESET_PASS,
        });
      return user;
    });
  }

  private static isAuthToken(token: string | object): token is AuthToken {
    return typeof token === 'object' && 'uuid' in token;
  }

  private static generateAccessCode(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
