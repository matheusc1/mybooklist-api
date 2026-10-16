import { Module } from '@nestjs/common'
import { DatabaseModule } from '@/database/database.module'
import { StatsService } from './stats.service'
import { DrizzleStatsRepository } from './stats.drizzle-repository'
import { StatsRepository } from './stats.repository'

@Module({
  imports: [DatabaseModule],
  providers: [
    StatsService,
    DrizzleStatsRepository,
    {
      provide: StatsRepository,
      useExisting: DrizzleStatsRepository,
    },
  ],
  exports: [StatsService],
})
export class StatsModule {}
