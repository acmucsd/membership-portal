import { QueryRunner } from 'typeorm';
import { QueryResultCache } from 'typeorm/cache/QueryResultCache';
import { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions';

/**
 * Caches query result into simple in-memory map.
 */
export class InMemoryDatabaseCache implements QueryResultCache {
  private cache: Record<string, QueryResultCacheOptions>;

  private static instance: InMemoryDatabaseCache;

  constructor() {
    this.cache = {};
  }

  connect(): Promise<void> {
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    return Promise.resolve();
  }

  synchronize(_queryRunner?: QueryRunner | undefined): Promise<void> {
    return Promise.resolve();
  }

  getFromCache(options: QueryResultCacheOptions, _queryRunner?: QueryRunner | undefined):
  Promise<QueryResultCacheOptions | undefined> {
    const result = this.cache[options.identifier];
    return Promise.resolve(result);
  }

  storeInCache(options: QueryResultCacheOptions, _savedCache: QueryResultCacheOptions | undefined,
    queryRunner?: QueryRunner | undefined): Promise<void> {
    this.cache[options.identifier] = options;
    return Promise.resolve();
  }

  isExpired(savedCache: QueryResultCacheOptions): boolean {
    const duration = typeof savedCache.duration === 'string' ? parseInt(savedCache.duration, 10) : savedCache.duration;
    const createdAt = typeof savedCache.time === 'string' ? parseInt(savedCache.time as any, 10) : savedCache.time;
    const expiresAt = createdAt! + duration;
    return expiresAt < new Date().getTime();
  }

  clear(_queryRunner?: QueryRunner | undefined): Promise<void> {
    this.cache = {};
    return Promise.resolve();
  }

  remove(identifiers: string[], _queryRunner?: QueryRunner | undefined): Promise<void> {
    identifiers.forEach((identifier) => {
      if (this.cache[identifier]) {
        delete this.cache[identifier];
      }
    });
    return Promise.resolve();
  }

  static getInstance(): InMemoryDatabaseCache {
    if (!InMemoryDatabaseCache.instance) {
      InMemoryDatabaseCache.instance = new InMemoryDatabaseCache();
    }
    return InMemoryDatabaseCache.instance;
  }
}
