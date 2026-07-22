import { DATABASE_CONNECTION } from '@/database/database-connection'
import { goals } from '@/database/schema/goals.schema'
import type { Database } from '@/database/database.types'
import { Injectable, Inject } from '@nestjs/common'
import { BooksService } from '@/books/books.service'

@Injectable()
export class GoalsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly booksService: BooksService,
  ) {}

  private get year() {
    return new Date().getFullYear()
  }

  async find(userId: string) {
    return this.db.query.goals.findFirst({
      where: { year: this.year, userId },
    })
  }

  async findWithProgress(userId: string) {
    const goal = await this.find(userId)
    const completed = await this.booksService.countCompleted(userId, this.year)

    return {
      year: this.year,
      target: goal?.target ?? null,
      current: completed,
    }
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
