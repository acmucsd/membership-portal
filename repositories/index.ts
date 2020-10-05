import { EntityManager } from 'typeorm';
import { UserRepository } from './UserRepository';
import { AttendanceRepository } from './AttendanceRepository';
import { EventRepository } from './EventRepository';
import { MerchOrderRepository, OrderItemRepository } from './MerchOrderRepository';
import { MerchCollectionRepository, MerchItemRepository, MerchItemOptionRepository } from './MerchStoreRepository';
import { ActivityRepository } from './ActivityRepository';
import { LeaderboardRepository } from './LeaderboardRepository';

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

  public static merchStoreCollection(transactionalEntityManager: EntityManager): MerchCollectionRepository {
    return transactionalEntityManager.getCustomRepository(MerchCollectionRepository);
  }

  public static merchStoreItem(transactionalEntityManager: EntityManager): MerchItemRepository {
    return transactionalEntityManager.getCustomRepository(MerchItemRepository);
  }

  public static merchStoreItemOption(transactionalEntityManager: EntityManager): MerchItemOptionRepository {
    return transactionalEntityManager.getCustomRepository(MerchItemOptionRepository);
  }

  public static user(transactionalEntityManager: EntityManager): UserRepository {
    return transactionalEntityManager.getCustomRepository(UserRepository);
  }
}
