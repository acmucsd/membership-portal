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

describe('leaderboard', () => {
  test('all-time', async () => {});
  test('only left-bounded (leaderboard since ...)', async () => {});
  test('only right-bounded (leaderboard until ...)', async () => {});
  test('left- and right-bounded (leaderboard between ... and ...)', async () => {});
});
