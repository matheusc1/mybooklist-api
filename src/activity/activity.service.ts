import { StatsService } from '@/stats/stats.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class ActivityService {
  constructor(private readonly statsService: StatsService) {}

  async getActivity(userId: string, month: string) {
    const [monthlyStats, monthlyActivity] = await Promise.all([
      this.statsService.monthlyStats(userId, month),
      this.statsService.monthlyActivity(userId, month),
    ])

    return { monthlyStats, monthlyActivity }
  }
}
