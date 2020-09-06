import { Service } from 'typedi';
import { UserModel } from '@Models/UserModel';
import { ForbiddenError, NotFoundError, BadRequestError } from 'routing-controllers';
import { Config } from '@Config/index';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from 'repositories/UserRepository';
import { InjectManager } from 'typeorm-typedi-extensions';
import { Uuid, ActivityType, UserState } from 'types';
import { EntityManager } from 'typeorm';
import Repositories from 'repositories';

interface AuthToken {
  uuid: Uuid;
  admin: boolean;
}

@Service()
export default class UserAuthService {
  @InjectManager()
  private entityManager: EntityManager;

  public async checkAuthToken(authHeader: string): Promise<UserModel> {
    const token = jwt.verify(UserAuthService.parseAuthHeader(authHeader), Config.auth.secret);
    if (!UserAuthService.isAuthToken(token)) throw new BadRequestError('Invalid auth token');
    const user = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      return userRepository.findByUuid(token.uuid);
    });
    if (!user) throw new NotFoundError();
    return user;
  }

  public async login(email: string, pass: string): Promise<string> {
    const authenticatedUser = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByEmail(email.toLowerCase());
      if (!user) throw new NotFoundError('There is no account associated with that email');
      if (user.isBlocked()) throw new ForbiddenError('Your account has been blocked');
      if (!(await user.verifyPass(pass))) throw new ForbiddenError('Incorrect password');
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(user, ActivityType.ACCOUNT_LOGIN);
      return user;
    });
    const token: AuthToken = {
      uuid: authenticatedUser.uuid,
      admin: authenticatedUser.isAdmin(),
    };
    return jwt.sign(token, Config.auth.secret, { expiresIn: Config.auth.tokenLifespan });
  }

  public async checkCredentials(email: string, pass: string): Promise<UserModel> {
    const authenticatedUser = await this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByEmail(email.toLowerCase());
      if (!user) throw new NotFoundError('There is no account associated with that email');
      const passwordMatched = await user.verifyPass(pass);
      if (!passwordMatched) throw new ForbiddenError('Incorrect password');
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(user, ActivityType.ACCOUNT_LOGIN);
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

  public async changeAccessCode(user: UserModel): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      await userRepository.changeAccessCode(user);
    });
  }

  public async setAccountStateToPasswordReset(user: UserModel): Promise<void> {
    return this.entityManager.transaction(async (txn) => {
      const userRepository = Repositories.user(txn);
      await userRepository.setStateToPasswordReset(user);
      const activityRepository = Repositories.activity(txn);
      await activityRepository.logActivity(user, ActivityType.ACCOUNT_RESET_PASS_REQUEST);
    });
  }

  public async resetPassword(accessCode: string, newPassword: string): Promise<UserModel> {
    return this.entityManager.transaction('SERIALIZABLE', async (txn) => {
      const userRepository = Repositories.user(txn);
      const user = await userRepository.findByAccessCode(accessCode);
      if (!user) throw new BadRequestError('Invalid access code');

      await userRepository.upsertUser(user, {
        accessCode: null,
        hash: await UserRepository.generateHash(newPassword),
        state: UserState.ACTIVE,
      });

      const activityRepository = Repositories.activity(txn);
      activityRepository.logActivity(user, ActivityType.ACCOUNT_RESET_PASS);
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

  private static isAuthToken(token: string | object): token is AuthToken {
    return typeof token === 'object' && 'uuid' in token;
  }
}
