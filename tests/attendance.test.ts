import { DatabaseConnection } from './data';

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

describe('attendance', () => {
  test('members can attend events for points and credits', async () => {});
  test('throws if invalid attendance code', async () => {});
  test('throws if attendance code entered before event', async () => {});
  test('throws if attendance code entered after event', async () => {});
  test('throws if member has already attended event', async () => {});
  test('staff can volunteer at events for extra points and credits', async () => {});
});
