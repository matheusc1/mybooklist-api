import { Module } from '@nestjs/common'
import { ReadingSessionsController } from './reading-sessions.controller'
import { ReadingSessionsService } from './reading-sessions.service'
import { DatabaseModule } from '@/database/database.module'
import { BooksModule } from '@/books/books.module'
import { ReadingSessionsStatsService } from './reading-sessions-stats.service'
import { DrizzleReadingSessionsRepository } from './reading-sessions.drizzle-repository'
import { DrizzleReadingSessionsStatsRepository } from './reading-sessions-stats.drizzle-repository'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import { ReadingSessionsStatsRepository } from './reading-sessions-stats.repository'

@Module({
  imports: [DatabaseModule, BooksModule],
  controllers: [ReadingSessionsController],
  providers: [
    ReadingSessionsService,
    ReadingSessionsStatsService,
    DrizzleReadingSessionsRepository,
    DrizzleReadingSessionsStatsRepository,
    {
      provide: ReadingSessionsRepository,
      useExisting: DrizzleReadingSessionsRepository,
    },
    {
      provide: ReadingSessionsStatsRepository,
      useExisting: DrizzleReadingSessionsStatsRepository,
    },
  ],
  exports: [ReadingSessionsStatsService],
})
export class ReadingSessionsModule {}
