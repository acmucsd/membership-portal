import {
  SESv2Client,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'typedi';
import { logger as log } from '../utils/Logger';
import { Config } from '../config';
import { Uuid } from '../types';

type EmailData = SendEmailCommandInput;

@Service()
export default class EmailService {
  private readonly client = new SESv2Client({
    region: Config.ses.region,
    credentials: Config.ses.credentials,
  });

  private static readonly itemDisplayTemplate =
    EmailService.readTemplate('itemDisplay.ejs');

  private static readonly passwordResetTemplate =
    EmailService.readTemplate('passwordReset.ejs');

  private static readonly emailVerificationTemplate = EmailService.readTemplate(
    'emailVerification.ejs',
  );

  private static readonly orderConfirmationTemplate = EmailService.readTemplate(
    'orderConfirmation.ejs',
  );

  private static readonly orderCancellationTemplate = EmailService.readTemplate(
    'orderCancellation.ejs',
  );

  private static readonly automatedOrderCancellationTemplate =
    EmailService.readTemplate('cancelPendingOrdersConfirmation.ejs');

  private static readonly orderPickupMissedTemplate = EmailService.readTemplate(
    'orderPickupMissed.ejs',
  );

  private static readonly orderPickupCancelledTemplate =
    EmailService.readTemplate('orderPickupCancelled.ejs');

  private static readonly orderPickupUpdatedTemplate =
    EmailService.readTemplate('orderPickupUpdated.ejs');

  private static readonly orderFulfilledTemplate =
    EmailService.readTemplate('orderFulfilled.ejs');

  private static readonly orderPartiallyFulfilledTemplate =
    EmailService.readTemplate('orderPartiallyFulfilled.ejs');

  private static readonly expressCheckinConfirmationTemplate =
    EmailService.readTemplate('expressCheckinConfirmation.ejs');

  constructor() {}

  public async sendPasswordReset(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    try {
      const html = ejs.render(EmailService.passwordResetTemplate, {
        firstName,
        link: `${Config.client}/reset-password/${code}`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Membership Portal Password Reset' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send password reset email to ${email}`, { error });
    }
  }

  public async sendEmailVerification(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    try {
      const html = ejs.render(EmailService.emailVerificationTemplate, {
        firstName,
        link: `${Config.client}/verify-email/${code}`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Membership Portal Email Verification' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send verification email to ${email}`, { error });
    }
  }

  public async sendOrderConfirmation(
    email: string,
    firstName: string,
    order: OrderInfo,
  ): Promise<void> {
    try {
      const html = ejs.render(EmailService.orderConfirmationTemplate, {
        firstName,
        order,
        orderItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: order.items,
          totalCost: order.totalCost,
        }),
        pickupEvent: order.pickupEvent,
        link: `${Config.client}/store/orders`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Merch Store - Order Confirmation' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order confirmation email to ${email}`, {
        error,
      });
    }
  }

  public async sendOrderCancellation(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.itemDisplayTemplate, {
        items: order.items,
        totalCost: order.totalCost,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Merch Store - Order Cancellation' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order cancellation email to ${email}`, {
        error,
      });
    }
  }

  public async sendAutomatedOrderCancellation(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.itemDisplayTemplate, {
        items: order.items,
        totalCost: order.totalCost,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'ACM UCSD Merch Store - Automated Order Cancellation',
            },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(
        `Failed to send automated order cancellation email to ${email}`,
        { error },
      );
    }
  }

  public async sendOrderPickupMissed(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.orderPickupMissedTemplate, {
        firstName,
        order,
        orderItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: order.items,
          totalCost: order.totalCost,
        }),
        link: `${Config.client}/store/orders`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Merch Store - Order Pickup Missed' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup missed email to ${email}`, {
        error,
      });
    }
  }

  public async sendOrderPickupCancelled(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.orderPickupCancelledTemplate, {
        firstName,
        order,
        orderItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: order.items,
          totalCost: order.totalCost,
        }),
        link: `${Config.client}/store/orders`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'ACM UCSD Merch Store - Order Pickup Event Cancelled',
            },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup cancelled email to ${email}`, {
        error,
      });
    }
  }

  public async sendOrderPickupUpdated(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.orderPickupUpdatedTemplate, {
        firstName,
        order,
        orderItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: order.items,
          totalCost: order.totalCost,
        }),
        link: `${Config.client}/store/orders`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'ACM UCSD Merch Store - Order Pickup Event Updated',
            },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order pickup update email to ${email}`, {
        error,
      });
    }
  }

  public async sendOrderFulfillment(
    email: string,
    firstName: string,
    order: OrderInfo,
  ) {
    try {
      const html = ejs.render(EmailService.orderFulfilledTemplate, {
        firstName,
        order,
        orderItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: order.items,
          totalCost: order.totalCost,
        }),
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: { Data: 'ACM UCSD Merch Store - Order Fulfilled' },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send order fulfillment email to ${email}`, { error });
    }
  }

  public async sendPartialOrderFulfillment(
    email: string,
    firstName: string,
    fulfilledItems: OrderLineItem[],
    unfulfilledItems: OrderLineItem[],
    pickupEvent: OrderPickupEventInfo,
    orderUuid: string,
  ) {
    try {
      const html = ejs.render(EmailService.orderPartiallyFulfilledTemplate, {
        firstName,
        unfulfilledItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: unfulfilledItems,
        }),
        fulfilledItems: ejs.render(EmailService.itemDisplayTemplate, {
          items: fulfilledItems,
        }),
        pickupEvent,
        link: `${Config.client}/store/orders`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'ACM UCSD Merch Store - Order Partially Fulfilled',
            },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send partial order fulfillment email to ${email}`, {
        error,
      });
    }
  }

  public async sendExpressCheckinConfirmation(
    email: string,
    eventName,
    pointValue,
  ) {
    try {
      const html = ejs.render(EmailService.expressCheckinConfirmationTemplate, {
        eventName,
        pointValue,
        registerLink: `${Config.client}/register`,
        storeLink: `${Config.client}/store`,
      });
      const data: EmailData = {
        FromEmailAddress: Config.email.user,
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'ACM UCSD Express Checkin - Complete Your Account Registration',
            },
            Body: {
              Html: { Data: html },
            },
          },
        },
      };
      await this.sendEmail(data);
    } catch (error) {
      log.warn(`Failed to send express checkin confirmation to ${email}`, {
        error,
      });
    }
  }

  private static readTemplate(filename: string): string {
    return fs.readFileSync(
      path.join(__dirname, `../templates/${filename}`),
      'utf-8',
    );
  }

  private sendEmail(data: EmailData) {
    return this.client.send(new SendEmailCommand(data));
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
  uuid: Uuid;
  items: OrderLineItem[];
  totalCost: number;
  pickupEvent: OrderPickupEventInfo;
}
