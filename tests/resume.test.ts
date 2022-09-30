import { BadRequestError } from 'routing-controllers';
import { anything, instance, verify } from 'ts-mockito';
import { MediaType } from '../types';
import { ResumeModel } from '../models/ResumeModel';
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

    const storageService = Mocks.storage(fileLocation);
    const resumeController = ControllerFactory.resume(conn, instance(storageService));
    const response = await resumeController.updateResume(resume, member);
    expect(response.error).toBe(null);
    expect(response.resume.url).toBe(fileLocation);

    verify(storageService.deleteAtUrl(fileLocation)).never();
    verify(storageService.uploadToFolder(resume, MediaType.RESUME, anything(), anything())).called();
  });

  test('updating resume deletes all previous resumes', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState()
      .createUsers(member)
      .write();

    const resume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = 'fake location';

    const storageService = Mocks.storage(fileLocation);
    const resumeController = ControllerFactory.resume(conn, instance(storageService));
    const response = await resumeController.updateResume(resume, member);
    expect(response.error).toBe(null);

    const newResume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const response1 = await resumeController.updateResume(newResume, member);
    expect(response1.error).toBe(null);

    const repository = conn.getRepository(ResumeModel);
    const userResumes = await repository.find({
      where: {
        user: member,
      },
    });

    expect(userResumes.length).toBe(1);
    verify(storageService.deleteAtUrl(fileLocation)).called();
    verify(storageService.uploadToFolder(resume, MediaType.RESUME, anything(), anything())).called();
    verify(storageService.uploadToFolder(newResume, MediaType.RESUME, anything(), anything())).called();
  });

  test('uploading resumes with the wrong filetype throws an error', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState()
      .createUsers(member)
      .write();

    const image = FileFactory.image(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = 'fake location';

    const userController = ControllerFactory.resume(conn, Mocks.storage(fileLocation));
    expect(async () => {
      await userController.updateResume(image, member);
    }).rejects.toThrow(BadRequestError);
  });
});
