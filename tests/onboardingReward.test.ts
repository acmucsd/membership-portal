import { EventModel } from '../models/EventModel';
import { DatabaseConnection, UserFactory, PortalState, EventFactory, ResumeFactory } from './data';
import { ControllerFactory } from './controllers';

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

describe('collect onboarding reward', () => {
  test('can collect onboarding reward', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({
      bio: 'this is a bio',
      profilePicture: 'https://pfp.com',
    });
    const resume = ResumeFactory.fake({ user: member, isResumeVisible: true });

    const events: EventModel[] = [];
    for (let i = 0; i < 5; i += 1) {
      events.push(EventFactory.fake({ pointValue: 10 }));
    }

    await new PortalState()
      .createUsers(member)
      .createEvents(events[0], events[1], events[2], events[3], events[4])
      .attendEvents([member], events)
      .createResumes(member, resume)
      .write();

    const userController = ControllerFactory.user(conn);
    const response = await userController.collectOnboarding(member);
    const userProfile = response.user;

    expect(userProfile.onboardingCollected).toBe(true);
    expect(userProfile.points).toBe(60);
  });

  test('conditions not fulfilled', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake();

    await new PortalState()
      .createUsers(member)
      .write();

    const userController = ControllerFactory.user(conn);

    await expect(userController.collectOnboarding(member))
      .rejects.toThrow('Onboarding tasks not completed');
  });

  test('can collect onboarding reward', async () => {
    const conn = await DatabaseConnection.get();
    const member = UserFactory.fake({
      bio: 'this is a bio',
      profilePicture: 'https://pfp.com',
      onboardingCollected: true,
    });
    const resume = ResumeFactory.fake({ user: member, isResumeVisible: true });

    const events: EventModel[] = [];
    for (let i = 0; i < 5; i += 1) {
      events.push(EventFactory.fake({ pointValue: 10 }));
    }

    await new PortalState()
      .createUsers(member)
      .createEvents(events[0], events[1], events[2], events[3], events[4])
      .attendEvents([member], events)
      .createResumes(member, resume)
      .write();

    const userController = ControllerFactory.user(conn);

    await expect(userController.collectOnboarding(member))
      .rejects.toThrow('Onboarding reward already collected!');
  });
});
