import { Inject, Injectable } from '@nestjs/common'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { goals } from '@/database/schema/goals.schema'
import { GoalsRepository } from './goals.repository'

@Injectable()
export class DrizzleGoalsRepository extends GoalsRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super()
  }

  find(userId: string, year: number) {
    return this.db.query.goals.findFirst({ where: { year, userId } })
  }

  async upsert(userId: string, year: number, target: number) {
    await this.db
      .insert(goals)
      .values({ userId, year, target })
      .onConflictDoUpdate({
        target: [goals.userId, goals.year],
        set: { target },
      })
  }
}
