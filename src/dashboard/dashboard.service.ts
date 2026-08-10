import { BooksService } from '@/books/books.service'
import { ReadingSessionsStatsService } from '@/reading-sessions/reading-sessions-stats.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class DashboardService {
  constructor(
    private readonly booksService: BooksService,
    private readonly readingSessionsStatsService: ReadingSessionsStatsService,
  ) {}

  async getDashboard(userId: string) {
    const [currentlyReading, recentActivity, lastCompleted, weeklyStats] =
      await Promise.all([
        this.booksService.findCurrentlyReading(userId),
        this.booksService.findRecentActivity(userId, 3),
        this.booksService.findLastCompleted(userId, 3),
        this.readingSessionsStatsService.weeklyStats(userId),
      ])

    return { currentlyReading, recentActivity, lastCompleted, weeklyStats }
  }
}
