import { Service } from 'typedi';
import { ForbiddenError, NotFoundError, BadRequestError } from 'routing-controllers';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { EntityManager } from 'typeorm';
import { ExpressCheckinModel } from 'models/ExpressCheckinModel';
import { Uuid, ActivityType, UserState, UserRegistration, UserAccessType } from '../types';
import { Config } from '../config';
import { UserModel } from '../models/UserModel';
import Repositories, { TransactionsManager, UserRepository } from '../repositories';
import UserAccountService from './UserAccountService';

interface AuthToken {
  uuid: Uuid;
  accessType: UserAccessType;
}

@Service()
export default class UserAuthService {
  private transactions: TransactionsManager;

  constructor(transactions: TransactionsManager) {
    this.transactions = transactions;
  }

  public async registerUser(registration: UserRegistration): Promise<UserModel> {
    return this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);

      const { email } = registration;
      const emailAlreadyUsed = await userRepository.isEmailInUse(email);
      if (emailAlreadyUsed) throw new BadRequestError('Email already in use');

      if (registration.handle) {
        const userHandleTaken = await userRepository.isHandleTaken(registration.handle);
        if (userHandleTaken) throw new BadRequestError('This handle is already in use.');
      }
      const userHandle = registration.handle
         ?? UserAccountService.generateDefaultHandle(registration.firstName, registration.lastName);

      const user = await userRepository.upsertUser(userRepository.create({
        ...registration,
        hash: await UserRepository.generateHash(registration.password),
        accessCode: UserAuthService.generateAccessCode(),
        handle: userHandle,
      }));

      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity({
        user,
        type: ActivityType.ACCOUNT_CREATE,
      });

      const expressCheckin = await Repositories.expressCheckin(txn).getPastExpressCheckin(email);
      if (expressCheckin) {
        await this.processExpressCheckin(user, expressCheckin, txn);
      }

      return user;
    });
  }

  /**
   * Creates the attendance and activity records and awards user points
   * given the express checkin details.
   */
  private async processExpressCheckin(user: UserModel,
    expressCheckin: ExpressCheckinModel,
    txn: EntityManager): Promise<void> {
    const { event } = expressCheckin;

    await Repositories.attendance(txn).writeAttendance({
      user,
      event,
      asStaff: false,
    });
    await Repositories.activity(txn).logActivity({
      user,
      type: ActivityType.ATTEND_EVENT,
    });
    await Repositories.user(txn).addPoints(user, event.pointValue);
  }

  public async modifyEmail(user: UserModel, proposedEmail: string): Promise<UserModel> {
    const updatedUser = await this.transactions.readWrite(async (txn) => {
      const userRepository = Repositories.user(txn);

      proposedEmail = proposedEmail.toLowerCase();

      const emailAlreadyUsed = !!(await userRepository.findByEmail(proposedEmail));
      if (emailAlreadyUsed) throw new BadRequestError('Email already in use');

      return userRepository.upsertUser(user, {
        email: proposedEmail,
        state: UserState.PENDING,
      });
    });

    return this.setAccessCode(updatedUser.email);
  }

  public async checkAuthToken(authHeader: string): Promise<UserModel> {
    const token = jwt.verify(UserAuthService.parseAuthHeader(authHeader), Config.auth.secret);
    if (!UserAuthService.isAuthToken(token)) throw new BadRequestError('Invalid auth token');
    const user = await this.transactions.readOnly(async (txn) => Repositories
      .user(txn)
      .findByUuid(token.uuid));
    if (!user) throw new NotFoundError();
    return user;
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
      accessType: user.accessType,
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
      if (!user) throw new NotFoundError('There is no account associated with that email');
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

  private static parseAuthHeader(authHeader: string): string {
    const splitHeader = authHeader.split(' ');
    const invalidAuthFormat = splitHeader.length !== 2
            || splitHeader[0] !== 'Bearer'
            || splitHeader[1].length === 0;
    if (invalidAuthFormat) {
      throw new ForbiddenError();
    }
    return splitHeader[1];
  }

  public static isAuthToken(token: string | object): token is AuthToken {
    return typeof token === 'object' && 'uuid' in token;
  }

  private static generateAccessCode(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
