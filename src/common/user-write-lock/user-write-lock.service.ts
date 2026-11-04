import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { User } from '@/users/entities/user.entity';

/**
 * Serialize writes touching a user's goal tree, focus list, or areas.
 * The lock avoids concurrent updates creating cycles or exceeding 3 focus goals.
 * Never call this helper from inside another transaction.
 */
@Injectable()
export class UserWriteLock {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(userId: string, callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOneOrFail();
      return callback(manager);
    });
  }
}
