import { ReadingSessionsStatsService } from '@/reading-sessions/reading-sessions-stats.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ActivityService {
  constructor(
    private readonly readingSessionsStatsService: ReadingSessionsStatsService,
  ) {}

  async getActivity(userId: string, month: string) {
    const [monthlyStats, monthlyActivity] = await Promise.all([
      this.readingSessionsStatsService.monthlyStats(userId, month),
      this.readingSessionsStatsService.monthlyActivity(userId, month),
    ])

    return { monthlyStats, monthlyActivity }
  }
}
