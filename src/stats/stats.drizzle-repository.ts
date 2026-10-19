import { Inject, Injectable } from '@nestjs/common'
import { and, count, countDistinct, desc, eq, gte, lte, sum } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'
import { readingSessions } from '@/database/schema/reading-sessions.schema'
import { StatsRepository } from './stats.repository'
import type { BookStatsRow, MonthlyActivityRow } from './stats.repository'

@Injectable()
export class DrizzleStatsRepository extends StatsRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super()
  }

  async findInRange(userId: string, start: string, end: string) {
    return this.db
      .select({ readingSession: readingSessions })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(
        and(
          eq(books.userId, userId),
          gte(readingSessions.readAt, start),
          lte(readingSessions.readAt, end),
        ),
      )
      .then((rows) => rows.map((r) => r.readingSession))
  }

  findMonthlyActivity(
    userId: string,
    start: string,
    end: string,
  ): Promise<MonthlyActivityRow[]> {
    return this.db
      .select({
        id: readingSessions.id,
        date: readingSessions.readAt,
        bookId: readingSessions.bookId,
        title: books.title,
        author: books.author,
        coverUrl: books.coverUrl,
        fromPage: readingSessions.fromPage,
        toPage: readingSessions.toPage,
        duration: readingSessions.durationSeconds,
      })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(
        and(
          eq(books.userId, userId),
          gte(readingSessions.readAt, start),
          lte(readingSessions.readAt, end),
        ),
      )
      .orderBy(readingSessions.readAt, readingSessions.createdAt)
  }

  async findDistinctReadDates(userId: string) {
    return this.db
      .selectDistinct({ readAt: readingSessions.readAt })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(eq(books.userId, userId))
      .orderBy(desc(readingSessions.readAt))
      .then((rows) => rows.map((r) => r.readAt))
  }

  async findBookStats(bookId: string, userId: string): Promise<BookStatsRow> {
    const [stats] = await this.db
      .select({
        sessions: count(readingSessions.id),
        totalReadingSeconds: sum(readingSessions.durationSeconds),
        activeDays: countDistinct(readingSessions.readAt),
      })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))

    if (!stats) throw new Error('Book stats aggregation returned no result')

    return stats
  }
}
