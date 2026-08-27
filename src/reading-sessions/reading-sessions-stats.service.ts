import { BadRequestException, Injectable } from '@nestjs/common'
import { ReadingSessionsStatsRepository } from './reading-sessions-stats.repository'
import { formatDate } from '@/common/format-date'
import type { ReadingSession } from './reading-sessions.types'

@Injectable()
export class ReadingSessionsStatsService {
  constructor(private readonly repository: ReadingSessionsStatsRepository) {}

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
    const { start, end, startDate } = this.getCurrentWeekRange()
    const sessions = await this.findSessionsInRange(userId, start, end)

    const pagesByDay = this.groupPagesByDay(sessions, startDate)

    const totalPagesRead = pagesByDay.reduce((sum, d) => sum + d.pages, 0)
    const totalReadingMinutes = this.sumMinutes(sessions)

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

  async monthlyStats(userId: string, month: string) {
    const { start, end } = this.getMonthRange(month)
    const sessions = await this.findSessionsInRange(userId, start, end)

    const pages = this.sumPages(sessions)
    const readingTime = this.sumMinutes(sessions)
    const activeDays = new Set(sessions.map((s) => s.readAt)).size

    return {
      sessions: sessions.length,
      pages,
      readingTime,
      activeDays,
    }
  }

  async monthlyActivity(userId: string, month: string) {
    const { start, end } = this.getMonthRange(month)

    const rows = await this.repository.findMonthlyActivity(userId, start, end)

    const calendarMap = new Map<string, typeof rows>()

    for (const row of rows) {
      const existing = calendarMap.get(row.date) ?? []
      existing.push(row)
      calendarMap.set(row.date, existing)
    }

    return Array.from(calendarMap.entries()).map(([date, sessions]) => ({
      date,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sessions: sessions.map(({ date: _date, duration, ...session }) => ({
        ...session,
        duration: Math.round(duration / 60),
      })),
    }))
  }

  private async findSessionsInRange(
    userId: string,
    start: string,
    end: string,
  ) {
    return this.repository.findInRange(userId, start, end)
  }

  private sumPages(sessions: ReadingSession[]) {
    return sessions.reduce((sum, s) => sum + (s.toPage - s.fromPage + 1), 0)
  }

  private sumMinutes(sessions: ReadingSession[]) {
    return Math.round(
      sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60,
    )
  }

  private getCurrentWeekRange() {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    return {
      start: formatDate(monday),
      end: formatDate(sunday),
      startDate: monday,
    }
  }

  private getMonthRange(month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be in YYYY-MM format')
    }

    const [year, monthNumber] = month.split('-').map(Number)

    const start = new Date(year, monthNumber - 1, 1)
    const end = new Date(year, monthNumber, 0)

    return {
      start: formatDate(start),
      end: formatDate(end),
    }
  }

  private groupPagesByDay(sessions: ReadingSession[], weekStart: Date) {
    const pagesByDate = new Map<string, number>()

    for (const session of sessions) {
      const pages = session.toPage - session.fromPage + 1
      const current = pagesByDate.get(session.readAt) ?? 0

      pagesByDate.set(session.readAt, current + pages)
    }

    return this.weekDayLabels.map((day, index) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + index)

      const dateKey = formatDate(date)

      return { day, pages: pagesByDate.get(dateKey) ?? 0 }
    })
  }

  private async calculateStreak(userId: string) {
    const sessions = await this.repository.findDistinctReadDates(userId)

    if (sessions.length === 0) return 0

    const readDates = new Set(sessions)
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
