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

  private static readonly orderCancellationTemplate = EmailService.readTemplate('orderCancellation.ejs');

  private static readonly orderPickupMissedTemplate = EmailService.readTemplate('orderPickupMissed.ejs');

  private static readonly orderPickupCancelledTemplate = EmailService.readTemplate('orderPickupCancelled.ejs');

  private static readonly orderPickupUpdatedTemplate = EmailService.readTemplate('orderPickupUpdated.ejs');

  private static readonly orderFulfilledTemplate = EmailService.readTemplate('orderFulfilled.ejs');

  private static readonly orderPartiallyFulfilledTemplate = EmailService.readTemplate('orderPartiallyFulfilled.ejs');

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

  public async sendOrderConfirmation(email: string, firstName: string, order: OrderInfo): Promise<void> {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Confirmation',
        html: ejs.render(EmailService.orderConfirmationTemplate, {
          firstName,
          order,
          pickupEvent: order.pickupEvent,
        }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order confirmation email to ${email}`, { error });
    }
  }

  public async sendOrderCancellation(email: string, firstName: string, order: OrderInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Cancellation',
        html: ejs.render(EmailService.orderCancellationTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order cancellation email to ${email}`, { error });
    }
  }

  public async sendOrderPickupMissed(email: string, firstName: string, order: OrderInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Pickup Missed',
        html: ejs.render(EmailService.orderPickupMissedTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup missed email to ${email}`, { error });
    }
  }

  public async sendOrderPickupCancelled(email: string, firstName: string, order: OrderInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Pickup Event Cancelled',
        html: ejs.render(EmailService.orderPickupCancelledTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup cancelled email to ${email}`, { error });
    }
  }

  public async sendOrderPickupUpdated(email: string, firstName: string, order: OrderInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Pickup Event Updated',
        html: ejs.render(EmailService.orderPickupUpdatedTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup update email to ${email}`, { error });
    }
  }

  public async sendOrderFulfillment(email: string, firstName: string, order: OrderInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Fulfilled',
        html: ejs.render(EmailService.orderFulfilledTemplate, { firstName, order }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order fulfillment email to ${email}`, { error });
    }
  }

  public async sendPartialOrderFulfillment(email: string, firstName: string,
    fulfilledItems: OrderLineItem[], unfulfilledItems: OrderLineItem[], pickupEvent: OrderPickupEventInfo) {
    try {
      const data = {
        to: email,
        from: Config.email.user,
        subject: 'ACM UCSD Merch Store - Order Partially Fulfilled',
        html: ejs.render(EmailService.orderPartiallyFulfilledTemplate, {
          firstName,
          unfulfilledItems,
          fulfilledItems,
          pickupEvent,
        }),
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send partial order fulfillment email to ${email}`, { error });
    }
  }

  private static readTemplate(filename: string): string {
    return fs.readFileSync(path.join(__dirname, `../templates/${filename}`), 'utf-8');
  }

  private sendEmail(data: EmailData) {
    return this.mailer.send(data);
  }
}

export interface OrderLineItem {
  itemName: string;
  picture: string;
  description: string;
  quantityRequested: number;
  salePrice: number;
  total: number;
}

export interface OrderPickupEventInfo {
  title: string;
  start: string;
  end: string;
  description: string;
}

export interface OrderInfo {
  items: OrderLineItem[];
  totalCost: number;
  pickupEvent: OrderPickupEventInfo;
}
