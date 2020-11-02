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
    return EventModel.merge(fake, substitute);
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
    return [new Date(start.valueOf()), new Date(end.valueOf())];
  }

  private static randomPointValue(): number {
    // some multiple of 5, min 5 and max 20
    return FactoryUtils.getRandomNumber(5, 20, 5);
  }
}
