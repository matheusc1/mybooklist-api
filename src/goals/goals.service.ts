import { DATABASE_CONNECTION } from '@/database/database-connection'
import { goals } from '@/database/schema/goals.schema'
import type { Database } from '@/database/database.types'
import { Injectable, Inject } from '@nestjs/common'

@Injectable()
export class GoalsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private get year() {
    return new Date().getFullYear()
  }

  async find(userId: string) {
    return this.db.query.goals.findFirst({
      where: { year: this.year, userId },
    })
  }

  async upsert(userId: string, target: number) {
    const [goal] = await this.db
      .insert(goals)
      .values({ userId, year: this.year, target })
      .onConflictDoUpdate({
        target: [goals.userId, goals.year],
        set: { target },
      })
      .returning()

    return goal
  }
}
