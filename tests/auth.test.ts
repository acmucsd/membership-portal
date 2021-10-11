import * as faker from 'faker';
import { anyString, instance, mock, verify, when } from 'ts-mockito';
import { UserAccessType } from '../types';
import EmailService from '../services/EmailService';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';

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

    const emailService: EmailService = mock(EmailService);
    const emailInstance = instance(emailService);
    const authController = ControllerFactory.auth(conn, emailInstance);
    const user = {
      email: 'acm@ucsd.edu',
      firstName: 'ACM',
      lastName: 'UCSD',
      password: 'password',
      major: UserFactory.major(),
      graduationYear: UserFactory.graduationYear(),
    };
    const registerRequest = { user };
    when(emailService.sendEmailVerification(anyString(), anyString(), anyString()))
      .thenReturn(Promise.resolve());
    const registerResponse = await authController.register(registerRequest, faker.datatype.hexaDecimal(10));

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

    verify(emailService.sendEmailVerification(anyString(), anyString(), anyString()))
      .called();
  });

  test('user cannot register with duplicate email address', async () => {});
});

describe('account login', () => {
  test('user can get a working auth token with credentials', async () => {});
  test('user cannot login with incorrect credentials', async () => {});
});

describe('verifying email', () => {
  test('user can verify email correctly', async () => {});
  test('user cannot verify email with incorrect code', async () => {});
});

describe('resending email verification', () => {
  test('email is resent correctly', async () => {});
  test('throws if request has unregistered email address', async () => {});
});

describe('password reset', () => {
  test('user can reset password correctly', async () => {});
  test('user cannot reset password with incorrect code', async () => {});
});

describe('resending password reset email', () => {
  test('email is resent and user state is correctly updated', async () => {});
  test('throws if request has unregistered email address', async () => {});
});
