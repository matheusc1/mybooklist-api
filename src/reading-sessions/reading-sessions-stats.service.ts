import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'
import { readingSessions } from '@/database/schema/reading-sessions.schema'
import { Injectable, Inject } from '@nestjs/common'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import type { ReadingSession } from './reading-sessions.types'
import { formatDate } from '@/common/format-date'

@Injectable()
export class ReadingSessionsStatsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  private readonly weekDayLabels = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ]

  async weeklyStats(userId: string) {
    const { start, end } = this.getCurrentWeekRange()

    const sessions = await this.db
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

    const pagesByDay = this.groupPagesByDay(sessions, start)

    const totalPagesRead = pagesByDay.reduce((sum, d) => sum + d.pages, 0)
    const totalReadingMinutes = Math.round(
      sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
    )

    const mostActiveDay =
      totalPagesRead === 0
        ? null
        : pagesByDay.reduce((a, b) => (b.pages > a.pages ? b : a)).day

    const daysStreak = await this.calculateStreak(userId)

    return {
      pagesByDay,
      totalPagesRead,
      totalReadingMinutes,
      mostActiveDay,
      daysStreak,
    }
  }

  private getCurrentWeekRange() {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = sunday
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: formatDate(monday),
      end: formatDate(sunday),
    }
  }

  private groupPagesByDay(sessions: ReadingSession[], weekStart: string) {
    const pagesByDate = new Map<string, number>()

    for (const session of sessions) {
      const pages = session.toPage - session.fromPage + 1
      const current = pagesByDate.get(session.readAt) ?? 0
      pagesByDate.set(session.readAt, current + pages)
    }

    const start = new Date(weekStart)

    return this.weekDayLabels.map((day, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const dateKey = formatDate(date)

      return { day, pages: pagesByDate.get(dateKey) ?? 0 }
    })
  }

  private async calculateStreak(userId: string) {
    const sessions = await this.db
      .selectDistinct({ readAt: readingSessions.readAt })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(eq(books.userId, userId))
      .orderBy(desc(readingSessions.readAt))

    if (sessions.length === 0) return 0

    const readDates = new Set(sessions.map((s) => s.readAt))
    const today = formatDate(new Date())
    const cursor = new Date()

    if (!readDates.has(today)) {
      cursor.setDate(cursor.getDate() - 1)
    }

    let streak = 0

    while (readDates.has(formatDate(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }
}
