import { BadRequestError } from 'routing-controllers';
import { Config } from '../config';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { FileFactory } from './data/FileFactory';
import Mocks from './mocks/MockFactory';

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

describe('upload resume', () => {
  test('authenticated user can upload resume', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState()
      .createUsers(member)
      .write();

    const resume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = 'fake location';

    const userController = ControllerFactory.user(conn, Mocks.storage(fileLocation));
    const response = await userController.updateResume(resume, member);
    expect(response.error).toBe(null);
    expect(response.user.resume).toBe(fileLocation);
  });

  test('wrong filetype', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState()
      .createUsers(member)
      .write();

    const image = FileFactory.image(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = 'fake location';

    const userController = ControllerFactory.user(conn, Mocks.storage(fileLocation));
    expect(async () => {
      await userController.updateResume(image, member);
    }).rejects.toThrow(BadRequestError);
  });
});
