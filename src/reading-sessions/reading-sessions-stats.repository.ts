import type { ReadingSession } from './reading-sessions.types'

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

export abstract class ReadingSessionsStatsRepository {
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
}
