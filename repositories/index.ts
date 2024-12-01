import { Service } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { UserRepository } from './UserRepository';
import { FeedbackRepository } from './FeedbackRepository';
import { AttendanceRepository, ExpressCheckinRepository } from './AttendanceRepository';
import { EventRepository } from './EventRepository';
import { MerchOrderRepository, OrderItemRepository, OrderPickupEventRepository } from './MerchOrderRepository';
import {
  MerchCollectionRepository,
  MerchItemRepository,
  MerchItemOptionRepository,
  MerchCollectionPhotoRepository,
  MerchItemPhotoRepository,
} from './MerchStoreRepository';
import { ActivityRepository } from './ActivityRepository';
import { LeaderboardRepository } from './LeaderboardRepository';
import { ResumeRepository } from './ResumeRepository';
import { UserSocialMediaRepository } from './UserSocialMediaRepository';

export default class Repositories {
  public static activity(entityManager: EntityManager) {
    return entityManager.withRepository(ActivityRepository);
  }

  public static attendance(entityManager: EntityManager) {
    return entityManager.withRepository(AttendanceRepository);
  }

  public static event(entityManager: EntityManager) {
    return entityManager.withRepository(EventRepository);
  }

  public static feedback(entityManager: EntityManager) {
    return entityManager.withRepository(FeedbackRepository);
  }

  public static leaderboard(entityManager: EntityManager) {
    return entityManager.withRepository(LeaderboardRepository);
  }

  public static merchStoreCollection(entityManager: EntityManager) {
    return entityManager.withRepository(MerchCollectionRepository);
  }

  public static merchStoreCollectionPhoto(entityManager: EntityManager) {
    return entityManager.withRepository(MerchCollectionPhotoRepository);
  }

  public static merchStoreItem(entityManager: EntityManager) {
    return entityManager.withRepository(MerchItemRepository);
  }

  public static merchStoreItemOption(entityManager: EntityManager) {
    return entityManager.withRepository(MerchItemOptionRepository);
  }

  public static merchStoreItemPhoto(entityManager: EntityManager) {
    return entityManager.withRepository(MerchItemPhotoRepository);
  }

  public static merchOrder(entityManager: EntityManager) {
    return entityManager.withRepository(MerchOrderRepository);
  }

  public static merchOrderItem(entityManager: EntityManager) {
    return entityManager.withRepository(OrderItemRepository);
  }

  public static merchOrderPickupEvent(entityManager: EntityManager) {
    return entityManager.withRepository(OrderPickupEventRepository);
  }

  public static resume(entityManager: EntityManager) {
    return entityManager.withRepository(ResumeRepository);
  }

  public static user(entityManager: EntityManager) {
    return entityManager.withRepository(UserRepository);
  }

  public static userSocialMedia(entityManager: EntityManager) {
    return entityManager.withRepository(UserSocialMediaRepository);
  }
}

@Service()
export class TransactionsManager {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // add automatic retries if transaction failing often - see membership portal
  public readOnly<T>(fn: (entityManager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction('REPEATABLE READ', fn);
  }

  public readWrite<T>(fn: (entityManager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction('SERIALIZABLE', fn);
  }
}
