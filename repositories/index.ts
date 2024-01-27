import { EntityManager } from 'typeorm';
import AsyncRetry = require('async-retry');
import { UserRepository } from './UserRepository';
import { FeedbackRepository } from './FeedbackRepository';
import { AttendanceRepository } from './AttendanceRepository';
import { EventRepository } from './EventRepository';
import { MerchOrderRepository, OrderItemRepository, OrderPickupEventRepository } from './MerchOrderRepository';
import {
  MerchCollectionRepository,
  MerchItemRepository,
  MerchItemOptionRepository,
  MerchItemPhotoRepository,
} from './MerchStoreRepository';
import { ActivityRepository } from './ActivityRepository';
import { LeaderboardRepository } from './LeaderboardRepository';
import { ResumeRepository } from './ResumeRepository';
import { UserSocialMediaRepository } from './UserSocialMediaRepository';

export default class Repositories {
  public static activity(transactionalEntityManager: EntityManager): ActivityRepository {
    return transactionalEntityManager.getCustomRepository(ActivityRepository);
  }

  public static attendance(transactionalEntityManager: EntityManager): AttendanceRepository {
    return transactionalEntityManager.getCustomRepository(AttendanceRepository);
  }

  public static event(transactionalEntityManager: EntityManager): EventRepository {
    return transactionalEntityManager.getCustomRepository(EventRepository);
  }

  public static leaderboard(transactionalEntityManager: EntityManager): LeaderboardRepository {
    return transactionalEntityManager.getCustomRepository(LeaderboardRepository);
  }

  public static merchOrder(transactionalEntityManager: EntityManager): MerchOrderRepository {
    return transactionalEntityManager.getCustomRepository(MerchOrderRepository);
  }

  public static merchOrderItem(transactionalEntityManager: EntityManager): OrderItemRepository {
    return transactionalEntityManager.getCustomRepository(OrderItemRepository);
  }

  public static merchOrderPickupEvent(transactionalEntityManager: EntityManager): OrderPickupEventRepository {
    return transactionalEntityManager.getCustomRepository(OrderPickupEventRepository);
  }

  public static merchStoreCollection(transactionalEntityManager: EntityManager): MerchCollectionRepository {
    return transactionalEntityManager.getCustomRepository(MerchCollectionRepository);
  }

  public static merchStoreItem(transactionalEntityManager: EntityManager): MerchItemRepository {
    return transactionalEntityManager.getCustomRepository(MerchItemRepository);
  }

  public static merchStoreItemPhoto(transactionalEntityManager: EntityManager): MerchItemPhotoRepository {
    return transactionalEntityManager.getCustomRepository(MerchItemPhotoRepository);
  }

  public static merchStoreItemOption(transactionalEntityManager: EntityManager): MerchItemOptionRepository {
    return transactionalEntityManager.getCustomRepository(MerchItemOptionRepository);
  }

  public static user(transactionalEntityManager: EntityManager): UserRepository {
    return transactionalEntityManager.getCustomRepository(UserRepository);
  }

  public static resume(transactionalEntityManager: EntityManager): ResumeRepository {
    return transactionalEntityManager.getCustomRepository(ResumeRepository);
  }

  public static feedback(transactionalEntityManager: EntityManager): FeedbackRepository {
    return transactionalEntityManager.getCustomRepository(FeedbackRepository);
  }

  public static userSocialMedia(transactionalEntityManager: EntityManager): UserSocialMediaRepository {
    return transactionalEntityManager.getCustomRepository(UserSocialMediaRepository);
  }
}

export class TransactionsManager {
  private transactionalEntityManager: EntityManager;

  constructor(transactionalEntityManager: EntityManager) {
    this.transactionalEntityManager = transactionalEntityManager;
  }

  public readOnly<T>(fn: (transactionalEntityManager: EntityManager) => Promise<T>): Promise<T> {
    return AsyncRetry(async (bail) => this.transactionalEntityManager.transaction('REPEATABLE READ', fn),
      { retries: 5 });
  }

  public readWrite<T>(fn: (transactionalEntityManager: EntityManager) => Promise<T>): Promise<T> {
    return AsyncRetry(async (bail) => this.transactionalEntityManager.transaction('SERIALIZABLE', fn),
      { retries: 5 });
  }
}
