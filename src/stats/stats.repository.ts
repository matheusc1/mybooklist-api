import type { ReadingSession } from '@/reading-sessions/reading-sessions.types'

export interface MonthlyActivityRow {
  id: string
  date: string
  bookId: string
  title: string
  author: string
  coverUrl: string | null
  fromPage: number
  toPage: number
  duration: number
}

export interface BookStatsRow {
  sessions: number
  totalReadingSeconds: string | null
  activeDays: number
}

export abstract class StatsRepository {
  abstract findInRange(
    userId: string,
    start: string,
    end: string,
  ): Promise<ReadingSession[]>

  abstract findMonthlyActivity(
    userId: string,
    start: string,
    end: string,
  ): Promise<MonthlyActivityRow[]>

  abstract findDistinctReadDates(userId: string): Promise<string[]>

  abstract findBookStats(bookId: string, userId: string): Promise<BookStatsRow>
}
