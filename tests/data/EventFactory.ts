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
    return EventModel.create({
      uuid: uuid(),
      organization: FactoryUtils.pickRandomValue(EventFactory.ORGS),
      title: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      location: faker.random.hexaDecimal(10),
      start,
      end,
      attendanceCode: faker.random.hexaDecimal(10),
      pointValue: EventFactory.randomPointValue(),
      requiresStaff: FactoryUtils.getRandomBoolean(),
      staffPointBonus: EventFactory.randomPointValue(),
    });
  }

  private static randomTime(): [Date, Date] {
    // between last and next week
    const days = FactoryUtils.getRandomNumber(14, -7);
    // between 8 AM and 6 PM
    const hour = FactoryUtils.getRandomNumber(10, 9);
    // between 0.5 and 2.5 hours long, rounded to the half hour
    const duration = FactoryUtils.getRandomNumber(5, 30, 30);
    const start = moment().subtract(days, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [new Date(start.valueOf()), new Date(end.valueOf())];
  }

  private static randomPointValue(): number {
    // some multiple of 5, min 5 and max 20
    return FactoryUtils.getRandomNumber(3, 5, 5);
  }
}
