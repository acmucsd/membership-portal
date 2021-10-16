import * as jwt from 'jsonwebtoken';
import { NotFoundError } from 'routing-controllers';
import { anyString, instance, mock, verify, when } from 'ts-mockito';
import { Config } from '../config';
import { UserModel } from '../models/UserModel';
import EmailService from '../services/EmailService';
import UserAuthService from '../services/UserAuthService';
import { UserAccessType, UserState } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import FactoryUtils from './data/FactoryUtils';

beforeAll(async () => {
  await DatabaseConnection.connect();
});

beforeEach(async () => {
  await DatabaseConnection.clear();
});

afterAll(async () => {
  await DatabaseConnection.clear();
  await DatabaseConnection.close();
});

describe('account registration', () => {
  test('user can register a new account', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });

    await new PortalState()
      .createUsers(admin)
      .write();

    const user = {
      email: 'acm@ucsd.edu',
      firstName: 'ACM',
      lastName: 'UCSD',
      password: 'password',
      major: UserFactory.major(),
      graduationYear: UserFactory.graduationYear(),
    };

    // register member
    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const registerRequest = { user };
    const registerResponse = await authController.register(registerRequest, FactoryUtils.randomHexString());

    // check that member is registered as expected
    const params = { uuid: registerResponse.user.uuid };
    const getUserResponse = await ControllerFactory.user(conn).getUser(params, admin);
    expect(getUserResponse.user).toStrictEqual({
      firstName: user.firstName,
      lastName: user.lastName,
      major: user.major,
      graduationYear: user.graduationYear,
      bio: null,
      points: 0,
      uuid: registerResponse.user.uuid,
      profilePicture: null,
    });

    // check that email verification is sent
    verify(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .called();
  });

  test('user cannot register with duplicate email address', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(admin, member)
      .write();

    const user = {
      email: member.email,
      firstName: 'ACM',
      lastName: 'UCSD',
      password: 'password',
      major: UserFactory.major(),
      graduationYear: UserFactory.graduationYear(),
    };

    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const registerRequest = { user };
    await expect(authController.register(registerRequest, FactoryUtils.randomHexString()))
      .rejects.toThrow('Email already in use');

    verify(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .never();
  });
});

describe('account login', () => {
  test('user can get a working auth token with credentials', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const loginRequest = {
      email: member.email,
      password: UserFactory.PASSWORD_RAW,
    };
    const loginResponse = await authController.login(loginRequest, FactoryUtils.randomHexString());

    // check auth token is as expected
    const decodedToken = jwt.verify(loginResponse.token, Config.auth.secret);
    if (!UserAuthService.isAuthToken(decodedToken)) throw new Error('Invalid auth token');
    expect(decodedToken.uuid).toEqual(member.uuid);
  });

  test('user cannot login with incorrect credentials', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const loginRequest = {
      email: member.email,
      password: `${UserFactory.PASSWORD_RAW}-wrong`,
    };
    await expect(authController.login(loginRequest, FactoryUtils.randomHexString()))
      .rejects.toThrow('Incorrect password');
  });
});

describe('verifying email', () => {
  test('user can verify email correctly', async () => {
    const conn = await DatabaseConnection.get();
    const accessCode = FactoryUtils.randomHexString();
    let member = UserFactory.fake({
      state: UserState.PENDING,
      accessCode,
    });

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(member.email, member.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    await authController.verifyEmail({ accessCode });

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.ACTIVE);
  });

  test('user cannot verify email with incorrect code', async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    let member = UserFactory.fake({
      state: UserState.PENDING,
      accessCode: FactoryUtils.randomHexString(),
    });

    await new PortalState()
      .createUsers(admin, member)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(member.email, member.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    await expect(authController.verifyEmail({ accessCode: FactoryUtils.randomHexString() }))
      .rejects.toThrow(NotFoundError);

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.PENDING);
  });
});

describe('resending email verification', () => {
  test('email is resent correctly', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(anyString(), anyString(), anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { email: member.email };
    await authController.resendEmailVerification(params);

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    verify(emailService.sendEmailVerification(anyString(), anyString(), anyString()))
      .called();
  });

  test('throws if request has unregistered email address', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    const emailService = mock(EmailService);
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { email: member.email };
    await expect(authController.resendEmailVerification(params))
      .rejects.toThrow(NotFoundError);

    verify(emailService.sendEmailVerification(member.email, member.firstName, anyString()))
      .never();
  });
});

describe('password reset', () => {
  test('user can reset password correctly', async () => {});
  test('user cannot reset password with incorrect code', async () => {});
});

describe('resending password reset email', () => {
  test('email is resent and user state is correctly updated', async () => {});
  test('throws if request has unregistered email address', async () => {});
});
