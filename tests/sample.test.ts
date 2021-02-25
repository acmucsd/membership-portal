import { ActivityType } from '../types';
import { ActivityModel } from '../models/ActivityModel';
import { AttendanceModel } from '../models/AttendanceModel';
import { EventModel } from '../models/EventModel';
import { UserModel } from '../models/UserModel';
import { DatabaseConnection, UserFactory, EventFactory, MerchFactory, PortalState } from './data';
import { OrderModel } from '../models/OrderModel';
import { FeedbackFactory } from './data/FeedbackFactory';

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
    const [event] = EventFactory.with({ attendanceCode: 'attend-me' });
    const [affordableOption] = MerchFactory.optionsWith({
      price: (event.pointValue * 100) - 10,
      discountPercentage: 0,
    });
    const merch = MerchFactory.collectionsWith({
      items: MerchFactory.itemsWith({
        options: [affordableOption],
      }),
    });
    const feedback = FeedbackFactory.create(1);

    const state = new PortalState()
      .createUsers([user1])
      .createEvents([event])
      .createMerch(merch)
      .attendEvents([user1], [event], false)
      .createUsers([user2])
      .orderMerch(user1, [{ option: affordableOption, quantity: 1 }])
      .submitFeedback(user1, feedback);

    await state.write(conn);

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
      ActivityType.ATTEND_EVENT,
      ActivityType.ACCOUNT_CREATE,
      ActivityType.ORDER_MERCHANDISE,
      ActivityType.SUBMIT_FEEDBACK,
    ]);

    const [order] = await conn.manager.find(OrderModel, { relations: ['user', 'items'] });
    expect(order.user.uuid).toStrictEqual(user1.uuid);
    expect(order.totalCost).toStrictEqual(affordableOption.price);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].option).toStrictEqual(affordableOption);
    expect(user1.credits).toStrictEqual(10);
  });
});
