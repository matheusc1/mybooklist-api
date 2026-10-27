import { Injectable } from '@nestjs/common'
import { BooksService } from '@/books/books.service'
import { GoalsService } from '@/goals/goals.service'
import { StatsService } from '@/stats/stats.service'

@Injectable()
export class YearlyOverviewService {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly statsService: StatsService,
    private readonly booksService: BooksService,
  ) {}

  async getYearlyOverview(userId: string, year: number) {
    const [goal, yearlyStats, completedBooks] = await Promise.all([
      this.goalsService.findWithProgress(userId, year),
      this.statsService.yearlyStats(userId, year),
      this.booksService.findCompletedByYear(userId, year),
    ])

    return { goal, yearlyStats, completedBooks }
  }
}
