import * as faker from 'faker';
import { } from '../types';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import EmailService from '../services/EmailService';

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

describe('express check-in', () => {
  test('succeeds for new accounts that have never used express check-in before', async () => {
    const conn = await DatabaseConnection.get();
    const event = EventFactory.fake(EventFactory.ongoing());
    await new PortalState().createEvents(event).write();

    const newUserEmail = faker.internet.email();

    const emailService = mock(EmailService);
    when(emailService.sendExpressCheckinConfirmation(newUserEmail, event.title)).thenResolve();
    const attendanceController = ControllerFactory.attendance(conn, instance(emailService));

    const request = {
      email: newUserEmail,
      attendanceCode: event.attendanceCode,
    };
    const response = await attendanceController.attendViaExpressCheckin(request);

    expect(response.error).toBeNull();
    expect(response.event).toStrictEqual(event.getPublicEvent());

    verify(emailService.sendExpressCheckinConfirmation(newUserEmail, event.title)).called();
  });

  test('throws proper error when user already has a registered account', async () => {
    const conn = await DatabaseConnection.get();
    const registeredMember = UserFactory.fake();
    const event = EventFactory.fake(EventFactory.ongoing());
    await new PortalState()
      .createUsers(registeredMember)
      .createEvents(event)
      .write();

    const newUserEmail = registeredMember.email;

    const emailService = mock(EmailService);
    const attendanceController = ControllerFactory.attendance(conn, instance(emailService));

    const request = {
      email: newUserEmail,
      attendanceCode: event.attendanceCode,
    };

    await (expect(attendanceController.attendViaExpressCheckin(request))
      .rejects
      .toThrow('This email already has an account registered to it. '
             + 'Please login to your account to check-in to this event!'));

    verify(emailService.sendExpressCheckinConfirmation(newUserEmail, event.title)).never();
  });

  test('throws proper error when user already used express checkin for the same event', async () => {
    const conn = await DatabaseConnection.get();
    const newUserEmail = faker.internet.email();
    const event = EventFactory.fake(EventFactory.ongoing());
    await new PortalState()
      .createEvents(event)
      .createExpressCheckin(newUserEmail, event)
      .write();

    const emailService = mock(EmailService);
    const attendanceController = ControllerFactory.attendance(conn, instance(emailService));

    const request = {
      email: newUserEmail,
      attendanceCode: event.attendanceCode,
    };

    await (expect(attendanceController.attendViaExpressCheckin(request))
      .rejects
      .toThrow('You have already successfully checked into this event!'));

    verify(emailService.sendExpressCheckinConfirmation(anything(), anything())).never();
  });

  test('throws proper error when user already used express checkin for any previous event', async () => {
    const conn = await DatabaseConnection.get();
    const newUserEmail = faker.internet.email();
    const previousEvent = EventFactory.fake(EventFactory.daysBefore(5));
    const ongoingEvent = EventFactory.fake(EventFactory.ongoing());
    await new PortalState()
      .createEvents(previousEvent, ongoingEvent)
      .createExpressCheckin(newUserEmail, previousEvent)
      .write();

    const emailService = mock(EmailService);
    const attendanceController = ControllerFactory.attendance(conn, instance(emailService));

    const request = {
      email: newUserEmail,
      attendanceCode: ongoingEvent.attendanceCode,
    };

    await (expect(attendanceController.attendViaExpressCheckin(request))
      .rejects
      .toThrow('You have already done an express check-in before for a previous event. '
             + 'Please complete your account registration to attend this event!'));

    verify(emailService.sendExpressCheckinConfirmation(anything(), anything())).never();
  });
});
