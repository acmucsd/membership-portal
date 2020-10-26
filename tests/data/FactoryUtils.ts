export default class FactoryUtils {
  public static create<T>(n: number, fn: () => T): T[] {
    return Array(n).fill(null).map(fn);
  }

  public static pickRandomValue<T>(values: T[]): T {
    const i = Math.floor(Math.random() * values.length);
    return values[i];
  }

  public static getRandomNumber(range: number, minimum = 0, scale = 1): number {
    return (Math.floor(Math.random() * range) % scale) + minimum;
  }

  public static getRandomBoolean(): boolean {
    return Boolean(Math.round(Math.random()));
  }
}
