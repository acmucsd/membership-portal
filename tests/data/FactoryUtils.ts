export default class FactoryUtils {
  public static create<T>(n: number, fn: () => T): T[] {
    return Array(n).fill(null).map(fn);
  }

  public static pickRandomValue<T>(values: T[]): T {
    const i = Math.floor(Math.random() * values.length);
    return values[i];
  }

  public static getRandomNumber(min: number, max: number, scale = 1): number {
    const range = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.floor(range / scale) * scale;
  }

  public static getRandomBoolean(): boolean {
    return Boolean(Math.round(Math.random()));
  }
}
