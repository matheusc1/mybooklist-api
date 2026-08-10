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
    const currentlyReading =
      await this.booksService.findCurrentlyReading(userId)

    const [recentActivity, lastCompleted, weeklyStats] = await Promise.all([
      this.booksService.findRecentActivity(userId, 3, currentlyReading?.id),
      this.booksService.findLastCompleted(userId, 3),
      this.readingSessionsStatsService.weeklyStats(userId),
    ])

    return { currentlyReading, recentActivity, lastCompleted, weeklyStats }
  }
}
