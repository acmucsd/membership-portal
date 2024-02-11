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
    const [start, end] = FactoryUtils.getRandomTimeInterval();
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
      committee: 'ACM',
      cover: `http://i.imgur.com/${faker.random.alphaNumeric(10)}.jpeg`,
      deleted: false,
      eventLink: faker.internet.url(),
      thumbnail: `http://i.imgur.com/${faker.random.alphaNumeric(10)}.jpeg`,
    });
    return EventModel.merge(fake, substitute);
  }

  public static ongoing(start = 45, end = 45): Partial<EventModel> {
    return {
      start: FactoryUtils.roundToHalfHour(moment().subtract(start, 'minutes')),
      end: FactoryUtils.roundToHalfHour(moment().add(end, 'minutes')),
    };
  }

  public static daysBefore(n: number): Partial<EventModel> {
    return {
      start: FactoryUtils.roundToHalfHour(moment().subtract(n, 'days').hour(11)),
      end: FactoryUtils.roundToHalfHour(moment().subtract(n, 'days').hour(13)),
    };
  }

  public static daysAfter(n: number): Partial<EventModel> {
    return {
      start: FactoryUtils.roundToHalfHour(moment().add(n, 'days').hour(11)),
      end: FactoryUtils.roundToHalfHour(moment().add(n, 'days').hour(13)),
    };
  }

  public static daysLong(n: number): Partial<EventModel> {
    return {
      start: FactoryUtils.roundToHalfHour(moment().hour(11)),
      end: FactoryUtils.roundToHalfHour(moment().add(n, 'days').hour(13)),
    };
  }

  private static randomPointValue(): number {
    // some multiple of 5, min 5 and max 20
    return FactoryUtils.getRandomNumber(5, 20, 5);
  }
}
