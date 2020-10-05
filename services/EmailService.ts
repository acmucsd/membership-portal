import { MailService, MailDataRequired } from '@sendgrid/mail';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { logger as log } from '../utils/Logger';
import { Config } from '../config';

type EmailData = MailDataRequired;

export default class EmailService {
  private readonly mailer = new MailService();

  private static readonly passwordResetTemplate = EmailService.readTemplate('passwordReset.ejs');

  private static readonly emailVerificationTemplate = EmailService.readTemplate('emailVerification.ejs');

  private static readonly orderConfirmationTemplate = EmailService.readTemplate('orderConfirmation.ejs');

  constructor() {
    this.mailer.setApiKey(Config.email.apiKey);
  }

  public async sendPasswordReset(email: string, firstName: string, code: string): Promise<void> {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Membership Portal Password Reset',
        html: ejs.render(EmailService.passwordResetTemplate, {
          firstName,
          link: `${Config.client}/resetPassword/${code}`,
        }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send password reset email to ${email}`, { error });
    }
  }

  public async sendEmailVerification(email: string, firstName: string, code: string): Promise<void> {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Membership Portal Email Verification',
        html: ejs.render(EmailService.emailVerificationTemplate, {
          firstName,
          link: `${Config.client}/verifyEmail/${code}`,
        }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send verification email to ${email}`, { error });
    }
  }

  public async sendOrderConfirmation(email: string, firstName: string, order: OrderConfirmationInfo): Promise<void> {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store Order Confirmation',
        html: ejs.render(EmailService.orderConfirmationTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order confirmation email to ${email}`, { error });
    }
  }

  private static readTemplate(filename: string): string {
    return fs.readFileSync(path.join(__dirname, `../templates/${filename}`), 'utf-8');
  }

  private sendEmail(data: EmailData) {
    return this.mailer.send(data);
  }
}

export interface OrderConfirmationLineItem {
  itemName: string;
  picture: string;
  description: string;
  quantityRequested: number;
  salePrice: number;
  total: number;
}

export interface OrderConfirmationInfo {
  items: OrderConfirmationLineItem[];
  totalCost: number;
}
