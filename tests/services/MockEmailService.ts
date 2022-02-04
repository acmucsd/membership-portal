import { MailService } from '@sendgrid/mail';
import { mock, when, instance, anything, spy } from 'ts-mockito';
import EmailService from '../../services/EmailService';

export class MockEmailService {
  public static mock() {
    const mailService = mock(MailService);

    when(mailService.setApiKey(anything())).thenReturn();
    when(mailService.send(anything())).thenResolve();

    const emailService = new EmailService(instance(mailService));

    return spy(emailService);
  }
}
