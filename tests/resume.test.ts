<<<<<<< HEAD
import { ActivityScope, ActivityType, SubmitAttendanceForUsersRequest, UserAccessType } from '../types';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
=======
import { BadRequestError } from 'routing-controllers';
import { anything, instance, verify } from 'ts-mockito';
import { MediaType } from '../types';
import { ResumeModel } from '../models/ResumeModel';
import { Config } from '../config';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, PortalState, UserFactory } from './data';
import { FileFactory } from './data/FileFactory';
import Mocks from './mocks/MockFactory';
>>>>>>> 8b76b670d914bc1c00f3871c979a5853c1e363bf

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

<<<<<<< HEAD
describe('resume permissions', () => {
  test('only visible resume is retrievable by only admins', async () => {
    const conn = await DatabaseConnection.get();
    const users = UserFactory.create(3);
    const emails = users.map((user) => user.email);
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const event = EventFactory.fake();

    await new PortalState()
      .createUsers(...users, admin)
      .createEvents(event)
      .write();

    const userController = ControllerFactory.user(conn);
    const adminController = ControllerFactory.admin(conn);
    const attendanceController = ControllerFactory.attendance(conn);

    // await adminController.submitAttendanceForUsers({ users: emails, event: event.uuid }, admin);

    // for (let u = 0; u < users.length; u += 1) {
    //   const user = users[u];
    //   const userResponse = await userController.getUser({ uuid: user.uuid }, admin);

    //   expect(userResponse.user.points).toEqual(user.points + event.pointValue);

    //   const attendanceResponse = await attendanceController.getAttendancesForCurrentUser(user);
    //   expect(attendanceResponse.attendances).toHaveLength(1);
    //   expect(attendanceResponse.attendances[0].event).toStrictEqual(event.getPublicEvent());

    //   const activityResponse = await userController.getUserActivityStream({ uuid: user.uuid }, admin);

    //   expect(activityResponse.activity).toHaveLength(2);
    //   expect(activityResponse.activity[1].pointsEarned).toEqual(event.pointValue);
    //   expect(activityResponse.activity[1].type).toEqual(ActivityType.ATTEND_EVENT);
    //   expect(activityResponse.activity[1].scope).toEqual(ActivityScope.PUBLIC);
    // }
  });

});
=======
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
>>>>>>> 8b76b670d914bc1c00f3871c979a5853c1e363bf
