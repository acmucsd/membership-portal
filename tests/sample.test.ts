import { ActivityType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { AttendanceModel } from '../models/AttendanceModel';
import { EventModel } from '../models/EventModel';
import { UserModel } from '../models/UserModel';
import { DatabaseConnection, UserFactory, EventFactory, MerchFactory, PortalState } from './data';
import { OrderModel } from '../models/OrderModel';
import { FeedbackFactory } from './data/FeedbackFactory';
import { MerchandiseItemModel } from '../models/MerchandiseItemModel';
import { MerchandiseCollectionModel } from '../models/MerchandiseCollectionModel';

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

describe('sample test', () => {
  test('database is empty', async () => {
    const conn = await DatabaseConnection.get();

    const users = await conn.manager.find(UserModel);
    expect(users).toHaveLength(0);

    const events = await conn.manager.find(EventModel);
    expect(events).toHaveLength(0);
  });

  test('data is persisted', async () => {
    const conn = await DatabaseConnection.get();
    const [user1, user2] = UserFactory.create(2);
    const event = EventFactory.fake({ attendanceCode: 'attend-me' });
    const affordableMerchOption = MerchFactory.fakeOption({
      price: (event.pointValue * 100) - 10,
      discountPercentage: 0,
    });
    const orderPickupEvent = MerchFactory.fakeOrderPickupEvent();
    const feedback = FeedbackFactory.fake();

    const state = new PortalState()
      .createUsers(user1, user2)
      .createEvents(event)
      .createMerchItemOptions(affordableMerchOption)
      .attendEvents([user1], [event], false)
      .createOrderPickupEvents(orderPickupEvent)
      .orderMerch(user1, [{ option: affordableMerchOption, quantity: 1 }], orderPickupEvent)
      .submitFeedback(user1, [feedback]);

    await state.write();

    const persistedUser = await conn.manager.findOne(UserModel, user2.uuid);
    expect(persistedUser).toStrictEqual(user2);

    const persistedEvent = await conn.manager.findOne(EventModel, { attendanceCode: 'attend-me' });
    expect(persistedEvent).toStrictEqual(event);

    const [attendance] = await conn.manager.find(AttendanceModel, { relations: ['user', 'event'] });
    expect(attendance.user).toStrictEqual(user1);
    expect(attendance.event).toStrictEqual(event);

    const activities = await conn.manager.find(ActivityModel);
    expect(activities).toHaveLength(5);
    const activityTypes = activities.map((a) => a.type);
    expect(activityTypes).toStrictEqual([
      ActivityType.ACCOUNT_CREATE,
      ActivityType.ACCOUNT_CREATE,
      ActivityType.ATTEND_EVENT,
      ActivityType.ORDER_MERCHANDISE,
      ActivityType.SUBMIT_FEEDBACK,
    ]);

    const [collection] = await conn.manager.find(MerchandiseCollectionModel, { relations: ['items'] });
    expect(collection.items).toHaveLength(1);
    const [item] = await conn.manager.find(MerchandiseItemModel, { relations: ['options'] });
    expect(item.options).toHaveLength(1);

    const [order] = await conn.manager.find(OrderModel, { relations: ['user', 'items'] });
    expect(order.user.uuid).toStrictEqual(user1.uuid);
    expect(order.totalCost).toStrictEqual(affordableMerchOption.price);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].option).toStrictEqual(affordableMerchOption);
    expect(user1.credits).toStrictEqual(10);
  });
});
