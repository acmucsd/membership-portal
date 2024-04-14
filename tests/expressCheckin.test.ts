import * as faker from 'faker';
import { } from '../types';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { ControllerFactory } from './controllers';
import { DatabaseConnection, EventFactory, PortalState, UserFactory } from './data';
import { EmailService } from '../services';
import { ExpressCheckinModel } from '../models';

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

    // email can have uppercases in it, so we should test that lowercase emails
    // are used by SendGrid / written to the database
    const newUserEmail = faker.internet.email();
    const lowercasedEmail = newUserEmail.toLowerCase();

    const emailService = mock(EmailService);
    when(emailService.sendExpressCheckinConfirmation(lowercasedEmail, event.title, event.pointValue)).thenResolve();
    const attendanceController = ControllerFactory.attendance(conn, instance(emailService));

    const request = {
      email: newUserEmail,
      attendanceCode: event.attendanceCode,
    };
    const response = await attendanceController.attendViaExpressCheckin(request);

    expect(response.error).toBeNull();
    expect(response.event).toStrictEqual(event.getPublicEvent());

    const expressCheckins = await conn.manager.find(ExpressCheckinModel, { relations: ['event'] });
    expect(expressCheckins).toHaveLength(1);
    expect(expressCheckins[0].email).toEqual(newUserEmail.toLowerCase());
    expect(expressCheckins[0].event).toEqual(event);

    verify(emailService.sendExpressCheckinConfirmation(lowercasedEmail, event.title, event.pointValue)).called();
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

    verify(emailService.sendExpressCheckinConfirmation(anything(), anything(), anything())).never();
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

    verify(emailService.sendExpressCheckinConfirmation(anything(), anything(), anything())).never();
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

    verify(emailService.sendExpressCheckinConfirmation(anything(), anything(), anything())).never();
  });
});
