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

  public static fake(): EventModel {
    const [start, end] = EventFactory.randomTime();
    return EventFactory.fakeWithTime(start, end);
  }

  private static fakeWithTime(start: Date, end: Date): EventModel {
    const event = EventFactory.fakeWithoutTime();
    event.start = start;
    event.end = end;
    return event;
  }

  public static fakeWithoutTime(): EventModel {
    return EventModel.create({
      uuid: uuid(),
      organization: FactoryUtils.pickRandomValue(EventFactory.ORGS),
      title: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      location: faker.random.hexaDecimal(10),
      attendanceCode: faker.random.hexaDecimal(10),
      pointValue: EventFactory.randomPointValue(),
      requiresStaff: FactoryUtils.getRandomBoolean(),
      staffPointBonus: EventFactory.randomPointValue(),
    });
  }

  public static fakePastEvent(): EventModel {
    const [start, end] = EventFactory.randomPastTime();
    return EventFactory.fakeWithTime(start, end);
  }

  public static fakeOngoingEvent(): EventModel {
    const [start, end] = EventFactory.randomOngoingTime();
    return EventFactory.fakeWithTime(start, end);
  }

  public static fakeFutureEvent(): EventModel {
    const [start, end] = EventFactory.randomFutureTime();
    return EventFactory.fakeWithTime(start, end);
  }

  private static randomTime(): [Date, Date] {
    // between last and next week
    const days = FactoryUtils.getRandomNumber(-7, 7);
    // between 8 AM and 6 PM
    const hour = FactoryUtils.getRandomNumber(9, 19);
    // between 0.5 and 2.5 hours long, rounded to the half hour
    const duration = FactoryUtils.getRandomNumber(30, 150, 30);
    const start = moment().subtract(days, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [start.toDate(), end.toDate()];
  }

  private static randomPastTime(): [Date, Date] {
    // only in the past
    const days = FactoryUtils.getRandomNumber(1, 7);
    // between 8 AM and 6 PM
    const hour = FactoryUtils.getRandomNumber(9, 19);
    // between 0.5 and 2.5 hours long, rounded to the half hour
    const duration = FactoryUtils.getRandomNumber(30, 150, 30);
    const start = moment().subtract(days, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [start.toDate(), end.toDate()];
  }

  private static randomOngoingTime(): [Date, Date] {
    // 0-2 hours before now, duration is 2 * hour
    const hour = FactoryUtils.getRandomNumber(0, 2);
    const start = moment().subtract(hour, 'hours');
    const end = moment().add(hour, 'hours');
    return [start.toDate(), end.toDate()];
  }

  private static randomFutureTime(): [Date, Date] {
    // only in the future
    const days = FactoryUtils.getRandomNumber(1, 7);
    // between 8 AM and 6 PM
    const hour = FactoryUtils.getRandomNumber(9, 19);
    // between 0.5 and 2.5 hours long, rounded to the half hour
    const duration = FactoryUtils.getRandomNumber(30, 150, 30);
    const start = moment().add(days, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [start.toDate(), end.toDate()];
  }

  private static randomPointValue(): number {
    // some multiple of 5, min 5 and max 20
    return FactoryUtils.getRandomNumber(5, 20, 5);
  }
}
