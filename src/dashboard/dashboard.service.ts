import { BooksService } from '@/books/books.service'
import { StatsService } from '@/stats/stats.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class DashboardService {
  constructor(
    private readonly booksService: BooksService,
    private readonly statsService: StatsService,
  ) {}

  async getDashboard(userId: string) {
    const currentlyReading =
      await this.booksService.findCurrentlyReading(userId)

    const [recentActivity, lastCompleted, weeklyStats] = await Promise.all([
      this.booksService.findRecentActivity(userId, 3, currentlyReading?.id),
      this.booksService.findLastCompleted(userId, 3),
      this.statsService.weeklyStats(userId),
    ])

    return { currentlyReading, recentActivity, lastCompleted, weeklyStats }
  }
}
