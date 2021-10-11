import * as moment from 'moment';

export default class FactoryUtils {
  public static create<T>(n: number, fn: () => T): T[] {
    return Array(n).fill(null).map(fn);
  }

  public static pickRandomValue<T>(values: T[]): T {
    const i = FactoryUtils.getRandomNumber(0, values.length - 1);
    return values[i];
  }

  public static getRandomNumber(min: number, max: number, scale = 1): number {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.floor(value / scale) * scale;
  }

  public static getRandomBoolean(): boolean {
    return Boolean(Math.round(Math.random()));
  }

  public static getRandomTimeInterval(): [Date, Date] {
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

  public static roundToHalfHour(date: moment.Moment): Date {
    const HALF_HOUR_IN_MILLISECONDS = moment.duration(30, 'minutes').asMilliseconds();
    return new Date(Math.round(date.valueOf() / HALF_HOUR_IN_MILLISECONDS) * HALF_HOUR_IN_MILLISECONDS);
  }
}
