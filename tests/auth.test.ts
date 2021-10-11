import { ActivityScope, ActivityType, SubmitAttendanceForUsersRequest, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';

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
  test('user can register a new account', async () => {});
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
