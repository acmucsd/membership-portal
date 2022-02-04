import { MailService } from '@sendgrid/mail';
import { mock, when, instance, anything, spy } from 'ts-mockito';
import EmailService, { OrderInfo, OrderLineItem, OrderPickupEventInfo } from '../../services/EmailService';

export class MockEmailService extends EmailService {
  constructor() {
    const mailService = mock(MailService);

    when(mailService.setApiKey(anything())).thenReturn();
    when(mailService.send(anything())).thenResolve();

    super(instance(mailService));
  }

  public async sendPasswordReset(email: string, firstName: string, code: string) {
    const result = await super.sendPasswordReset(email, firstName, code);
    expect(result).toEqual(true);
    return result;
  }

  public async sendEmailVerification(email: string, firstName: string, code: string) {
    const result = await super.sendEmailVerification(email, firstName, code);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderConfirmation(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderConfirmation(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderCancellation(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderCancellation(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderPickupMissed(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderPickupMissed(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderPickupCancelled(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderPickupCancelled(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderPickupUpdated(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderPickupUpdated(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendOrderFulfillment(email: string, firstName: string, order: OrderInfo) {
    const result = await super.sendOrderFulfillment(email, firstName, order);
    expect(result).toEqual(true);
    return result;
  }

  public async sendPartialOrderFulfillment(email: string, firstName: string, fulfilledItems: OrderLineItem[],
    unfulfilledItems: OrderLineItem[], pickupEvent: OrderPickupEventInfo, orderUuid: string) {
    const result = await super.sendPartialOrderFulfillment(email, firstName, fulfilledItems,
      unfulfilledItems, pickupEvent, orderUuid);
    expect(result).toEqual(true);
    return result;
  }

  public mock() {
    return spy(this);
  }
}
