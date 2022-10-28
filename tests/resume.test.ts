import { BadRequestError, ForbiddenError } from "routing-controllers";
import { anything, instance, verify } from "ts-mockito";
import { ActivityType, UserAccessType, MediaType } from "../types";
import { ResumeModel } from "../models/ResumeModel";
import { Config } from "../config";
import { ControllerFactory } from "./controllers";
import { DatabaseConnection, PortalState, UserFactory } from "./data";
import { FileFactory } from "./data/FileFactory";
import Mocks from "./mocks/MockFactory";
import { ResumeFactory } from "./data/ResumeFactory";
import { ActivityModel } from "../models/ActivityModel";

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

describe("resume fetching", () => {
  test("only admins can get all visible resumes", async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake();
    const resume = ResumeFactory.fake({ user: member, isResumeVisible: true });

    await new PortalState()
      .createUsers(admin, member)
      .createResumes(member, resume)
      .write();

    const resumeController = ControllerFactory.resume(conn);

    // throws permissions error for member
    expect(resumeController.getAllVisibleResumes(member)).rejects.toThrow(
      ForbiddenError
    );

    // get response resumes
    const response = await resumeController.getAllVisibleResumes(admin);
    expect(response.error).toBeNull();
    expect(response.resumes).toHaveLength(1);
    expect(response.resumes[0]).toStrictEqual({
      uuid: resume.uuid,
      user: member.getPublicProfile(),
      isResumeVisible: resume.isResumeVisible,
      url: resume.url,
      lastUpdated: resume.lastUpdated,
    });
  });

  test("admins cannot get invisible resumes", async () => {
    const conn = await DatabaseConnection.get();
    const admin = UserFactory.fake({ accessType: UserAccessType.ADMIN });
    const member = UserFactory.fake();
    const resume = ResumeFactory.fake({ user: member, isResumeVisible: false });

    await new PortalState()
      .createUsers(admin, member)
      .createResumes(member, resume)
      .write();

    const resumeController = ControllerFactory.resume(conn);
    const response = await resumeController.getAllVisibleResumes(admin);
    expect(response.error).toBeNull();
    expect(response.resumes).toHaveLength(0);
  });
});

describe("upload resume", () => {
  test("authenticated user can upload resume", async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState().createUsers(member).write();

    const resume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = "fake location";

    const storageService = Mocks.storage(fileLocation);
    const resumeController = ControllerFactory.resume(
      conn,
      instance(storageService)
    );
    const response = await resumeController.uploadResume(resume, member);
    expect(response.error).toBe(null);
    expect(response.resume.url).toBe(fileLocation);

    verify(storageService.deleteAtUrl(fileLocation)).never();
    verify(
      storageService.uploadToFolder(
        resume,
        MediaType.RESUME,
        anything(),
        anything()
      )
    ).called();

    const activity = await conn.manager.findOne(ActivityModel, {
      type: ActivityType.RESUME_UPLOAD,
    });
    expect(activity).toBeDefined();
  });

  test("updating resume deletes all previous resumes", async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState().createUsers(member).write();

    const resume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = "fake location";

    const storageService = Mocks.storage(fileLocation);
    const resumeController = ControllerFactory.resume(
      conn,
      instance(storageService)
    );
    const response = await resumeController.uploadResume(resume, member);
    expect(response.error).toBe(null);

    const newResume = FileFactory.pdf(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const response1 = await resumeController.uploadResume(newResume, member);
    expect(response1.error).toBe(null);

    const repository = conn.getRepository(ResumeModel);
    const userResumes = await repository.find({
      where: {
        user: member,
      },
    });

    expect(userResumes.length).toBe(1);
    verify(storageService.deleteAtUrl(fileLocation)).called();
    verify(
      storageService.uploadToFolder(
        resume,
        MediaType.RESUME,
        anything(),
        anything()
      )
    ).called();
    verify(
      storageService.uploadToFolder(
        newResume,
        MediaType.RESUME,
        anything(),
        anything()
      )
    ).called();
  });

  test("uploading resumes with the wrong filetype throws an error", async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    await new PortalState().createUsers(member).write();

    const image = FileFactory.image(Config.file.MAX_RESUME_FILE_SIZE / 2);
    const fileLocation = "fake location";

    const userController = ControllerFactory.resume(
      conn,
      Mocks.storage(fileLocation)
    );
    expect(async () => {
      await userController.uploadResume(image, member);
    }).rejects.toThrow(BadRequestError);
  });
});

describe("patch resume", () => {
  test("passing in resume patches properly persists in database", async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();
    const resume = ResumeFactory.fake({ isResumeVisible: false });
    await new PortalState()
      .createUsers(member)
      .createResumes(member, resume)
      .write();

    const patches = { isResumeVisible: true };
    const request = { resume: patches };
    const params = { uuid: resume.uuid };
    const resumeController = ControllerFactory.resume(conn);
    await resumeController.patchResume(params, request, member);

    const updatedResume = await conn.manager.findOne(ResumeModel, {
      uuid: resume.uuid,
    });

    expect(updatedResume.isResumeVisible).toBe(true);
  });

  test("patching a resume for another user throws a ForbiddenError", async () => {
    const conn = await DatabaseConnection.get();
    const [member, anotherMember] = UserFactory.create(2);
    const resume = ResumeFactory.fake({ isResumeVisible: false });
    await new PortalState()
      .createUsers(member, anotherMember)
      .createResumes(member, resume)
      .write();

    const patches = { isResumeVisible: true };
    const request = { resume: patches };
    const params = { uuid: resume.uuid };
    const resumeController = ControllerFactory.resume(conn);
    await expect(
      resumeController.patchResume(params, request, anotherMember)
    ).rejects.toThrowError(ForbiddenError);
  });
});
