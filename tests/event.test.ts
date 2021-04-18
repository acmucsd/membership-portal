import { DatabaseConnection } from "./data";

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

describe('event CRUD operations', () => {
  test('events from the past, present, future, and all time can be pulled', async () => {

  });

  test('events can be created with unused attendance codes', async () => {

  });

  test('events cannot be created with duplicate attendance codes', async () => {

  });
});

describe('event covers', () => {
  test('properly updates cover photo in database and on S3', async () => {

  });
});

describe('event feedback', () => {
  test('can be persisted and rewarded points when submitted for an event already attended', async () => {

  });
  
  test('is rejected on submission to an event not attended', async () => {

  });

  test('is rejected if submitted to an event multiple times', async () => {

  });

  test('is rejected if sent after 2 days of event completion', async () => {

  });
})