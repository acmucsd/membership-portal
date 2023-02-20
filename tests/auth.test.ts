import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
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
      handle: registerResponse.user.handle,
      uuid: registerResponse.user.uuid,
      profilePicture: null,
    });

    // check that email verification is sent
    verify(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .called();
  });

  test('user cannot register with duplicate email address', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
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

  test('User cannot register with existing handle', async () => {
    const conn = await DatabaseConnection.get();
    const [loggedInUser, otherUser] = UserFactory.create(2);

    await new PortalState()
      .createUsers(otherUser)
      .write();

    const user = {
      email: loggedInUser.email,
      firstName: 'ACM',
      lastName: 'UCSD',
      password: 'password',
      major: UserFactory.major(),
      graduationYear: UserFactory.graduationYear(),
      handle: otherUser.handle,
    };

    const emailService = mock(EmailService);
    when(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const registerRequest = { user };
    await expect(authController.register(registerRequest, FactoryUtils.randomHexString()))
      .rejects.toThrow('This handle is already in use.');

    verify(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .never();
  });

  test('User can include an optional handle to be set', async () => {
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
      handle: 'acmadmin',
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
      handle: user.handle,
      uuid: registerResponse.user.uuid,
      profilePicture: null,
    });

    // check that email verification is sent
    verify(emailService.sendEmailVerification(user.email, user.firstName, anyString()))
      .called();
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
    when(emailService.sendEmailVerification(member.email, member.firstName, anyString()))
      .thenResolve();
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { email: member.email };
    await authController.resendEmailVerification(params);

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    verify(emailService.sendEmailVerification(member.email, member.firstName, member.accessCode))
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

describe('email modification', () => {
  test('user can change email', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    const authController = ControllerFactory.auth(conn, instance(emailService));

    // call route to change email
    const request = { email: 'someemail@example.com' };

    when(emailService.sendEmailVerification(request.email, member.firstName, anyString()))
      .thenResolve();
    const response = await authController.modifyEmail(request, member);
    expect(response.error).toBeNull();

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.PENDING);
    expect(member.email).toEqual(request.email);

    // confirm the email
    await authController.verifyEmail({ accessCode: member.accessCode });

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.ACTIVE);
  });

  test('user cannot change email to an already existing email', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();
    const otherMember = UserFactory.fake({ email: 'anotheremail@acmucsd.org' });

    await new PortalState()
      .createUsers(member, otherMember)
      .write();

    const emailService = mock(EmailService);
    const authController = ControllerFactory.auth(conn, instance(emailService));

    // call route to change email
    const request = { email: otherMember.email };

    verify(emailService.sendEmailVerification(request.email, member.firstName, anyString())).never();
    await expect(authController.modifyEmail(request, member))
      .rejects.toThrow('Email already in use');

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.ACTIVE);
    expect(member.email).toEqual(member.email);
  });
});

describe('password reset', () => {
  test('user can reset password correctly', async () => {
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
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { accessCode };
    const newPassword = 'new-password';
    const passwordResetRequest = { user: {
      newPassword,
      confirmPassword: newPassword,
    } };
    await authController.resetPassword(params, passwordResetRequest, FactoryUtils.randomHexString());

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.ACTIVE);
    const passwordMatches = await bcrypt.compare(newPassword, member.hash);
    expect(passwordMatches).toBeTruthy();
    expect(member.accessCode).toBeNull();
  });

  test('user cannot reset password with incorrect code', async () => {
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
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { accessCode };
    const newPassword = 'new-password';
    const passwordResetRequest = { user: {
      newPassword,
      confirmPassword: newPassword,
    } };
    await authController.resetPassword(params, passwordResetRequest, FactoryUtils.randomHexString());

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.ACTIVE);
    const passwordMatches = await bcrypt.compare(newPassword, member.hash);
    expect(passwordMatches).toBeTruthy();
    expect(member.accessCode).toBeNull();
  });
});

describe('resending password reset email', () => {
  test('email is resent and user state is correctly updated', async () => {
    const conn = await DatabaseConnection.get();
    let member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const emailService = mock(EmailService);
    when(emailService.sendPasswordReset(member.email, member.firstName, anyString()));
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { email: member.email };
    await authController.sendPasswordResetEmail(params, FactoryUtils.randomHexString());

    member = await conn.manager.findOne(UserModel, { uuid: member.uuid });
    expect(member.state).toEqual(UserState.PASSWORD_RESET);

    verify(emailService.sendPasswordReset(member.email, member.firstName, member.accessCode))
      .called();
  });

  test('throws if request has unregistered email address', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    const emailService = mock(EmailService);
    when(emailService.sendPasswordReset(member.email, member.firstName, anyString()));
    const authController = ControllerFactory.auth(conn, instance(emailService));
    const params = { email: member.email };
    await expect(authController.sendPasswordResetEmail(params, FactoryUtils.randomHexString()))
      .rejects.toThrow(NotFoundError);

    verify(emailService.sendPasswordReset(member.email, member.firstName, anyString()))
      .never();
  });
});
