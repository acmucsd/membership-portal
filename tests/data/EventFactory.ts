import * as faker from 'faker';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import { EventModel } from '../../models/EventModel';
import FactoryUtils from './FactoryUtils';

export class EventFactory {
  private static readonly ORGS = [
    'ACM',
    'Cyber',
    'Hack',
    'AI',
    'Innovate',
    'Design',
  ];

  public static create(n: number): EventModel[] {
    return FactoryUtils.create(n, EventFactory.fake);
  }

  public static with(...substitutes: Partial<EventModel>[]): EventModel[] {
    return substitutes.map((sub) => EventModel.merge(EventFactory.fake(), sub));
  }

  public static fake(substitute?: Partial<EventModel>): EventModel {
    const [start, end] = EventFactory.randomTime();
    const fake = EventModel.create({
      uuid: uuid(),
      organization: FactoryUtils.pickRandomValue(EventFactory.ORGS),
      title: faker.datatype.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      location: faker.datatype.hexaDecimal(10),
      start,
      end,
      attendanceCode: faker.datatype.hexaDecimal(10),
      pointValue: EventFactory.randomPointValue(),
      requiresStaff: FactoryUtils.getRandomBoolean(),
      staffPointBonus: EventFactory.randomPointValue(),
    });
    return EventModel.merge(fake, substitute);
  }

  public static fakePastEvent(daysAgo = 1): EventModel {
    const [start, end] = EventFactory.randomPastTime(daysAgo);
    return EventFactory.with({ start, end })[0];
  }

  public static fakeOngoingEvent(): EventModel {
    const [start, end] = EventFactory.randomOngoingTime();
    return EventFactory.with({ start, end })[0];
  }

  public static fakeFutureEvent(daysAhead = 1): EventModel {
    const [start, end] = EventFactory.randomFutureTime(daysAhead);
    return EventFactory.with({ start, end })[0];
  }

  public static createEventFeedback(n: number): string[] {
    return new Array(n).fill(faker.random.word());
  }

  private static randomTime(): [Date, Date] {
    // random day between last and next week
    const day = FactoryUtils.getRandomNumber(-7, 7);
    return EventFactory.randomIntervalInDay(day);
  }

  private static randomPastTime(daysAgo: number): [Date, Date] {
    // random day between daysAgo and a week before daysAgo
    const day = FactoryUtils.getRandomNumber(-daysAgo - 7, -daysAgo);
    return EventFactory.randomIntervalInDay(day);
  }

  private static randomOngoingTime(): [Date, Date] {
    // 0 or 30 mins before now
    const currentHour = moment().hour();
    const hour = FactoryUtils.getRandomNumber(currentHour - 0.5, currentHour, 0.5);
    return EventFactory.randomIntervalInDay(0, hour);
  }

  private static randomFutureTime(daysAhead: number): [Date, Date] {
    // random day between daysAhead and a week after daysAhead
    const day = FactoryUtils.getRandomNumber(daysAhead, daysAhead + 7);
    return EventFactory.randomIntervalInDay(day);
  }

  private static randomIntervalInDay(day: number, hour?: number): [Date, Date] {
    // default between 8 AM and 6 PM
    if (!hour) hour = FactoryUtils.getRandomNumber(9, 19);
    // between 1 and 2.5 hours long, rounded to the half hour
    const duration = FactoryUtils.getRandomNumber(60, 150, 30);
    const start = moment().add(day, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [start.toDate(), end.toDate()];
  }

  private static randomPointValue(): number {
    // some multiple of 5, min 5 and max 20
    return FactoryUtils.getRandomNumber(5, 20, 5);
  }
}
