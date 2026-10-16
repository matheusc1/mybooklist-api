import { Module } from '@nestjs/common'
import { DatabaseModule } from '@/database/database.module'
import { ReadingSessionsStatsService } from './reading-sessions-stats.service'
import { DrizzleReadingSessionsStatsRepository } from './reading-sessions-stats.drizzle-repository'
import { ReadingSessionsStatsRepository } from './reading-sessions-stats.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    ReadingSessionsStatsService,
    DrizzleReadingSessionsStatsRepository,
    {
      provide: ReadingSessionsStatsRepository,
      useExisting: DrizzleReadingSessionsStatsRepository,
    },
  ],
  exports: [ReadingSessionsStatsService],
})
export class StatsModule {}
