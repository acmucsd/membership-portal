import * as faker from 'faker';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import { EventModel } from '../../models/EventModel';

export class EventFactory {
  private static readonly ORGS = [
    'ACM',
    'Cyber',
    'Hack',
    'Innovate',
    'Design',
  ];

  public static create(n: number): EventModel[] {
    return Array(n).fill(null).map(() => EventFactory.fake());
  }

  public static with(...substitutes: Partial<EventModel>[]): EventModel[] {
    return substitutes.map((sub) => EventModel.merge(EventFactory.fake(), sub));
  }

  public static fake(): EventModel {
    const [start, end] = EventFactory.randomTime();
    return EventModel.create({
      uuid: uuid(),
      organization: EventFactory.randomOrg(),
      title: faker.random.hexaDecimal(10),
      description: faker.lorem.sentences(2),
      location: faker.random.hexaDecimal(10),
      start,
      end,
      attendanceCode: faker.random.hexaDecimal(10),
      pointValue: EventFactory.randomPointValue(),
      requiresStaff: Boolean(Math.round(Math.random())),
      staffPointBonus: EventFactory.randomPointValue(),
    });
  }

  private static randomTime(): [Date, Date] {
    // between last and next week
    const days = Math.floor(Math.random() * 14) - 7;
    // between 8 AM and 6 PM
    const hour = Math.floor(Math.random() * 10) + 8;
    // between 0.5 and 2.5 hours long, rounded to the half hour
    const duration = (Math.floor(Math.random() * 120) % 30) + 30;
    const start = moment().subtract(days, 'days').hour(hour);
    const end = moment(start.valueOf()).add(duration, 'minutes');
    return [new Date(start.valueOf()), new Date(end.valueOf())];
  }

  private static randomOrg(): string {
    const i = Math.floor(Math.random() * EventFactory.ORGS.length);
    return EventFactory.ORGS[i];
  }

  private static randomPointValue(): number {
    return Math.floor(Math.random() * 15) + 5;
  }
}
