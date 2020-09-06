import { EntityManager } from 'typeorm';
import { UserRepository } from './UserRepository';
import { AttendanceRepository } from './AttendanceRepository';
import { EventRepository } from './EventRepository';
import { MerchOrderRepository, OrderItemRepository } from './MerchOrderRepository';
import { MerchCollectionRepository, MerchItemRepository } from './MerchStoreRepository';
import { ActivityRepository } from './ActivityRepository';

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

  public static user(transactionalEntityManager: EntityManager): UserRepository {
    return transactionalEntityManager.getCustomRepository(UserRepository);
  }
}
