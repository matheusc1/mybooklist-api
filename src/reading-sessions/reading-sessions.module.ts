import { Module } from '@nestjs/common'
import { ReadingSessionsController } from './reading-sessions.controller'
import { ReadingSessionsService } from './reading-sessions.service'
import { DatabaseModule } from '@/database/database.module'
import { BooksModule } from '@/books/books.module'
import { ReadingSessionsStatsService } from './reading-sessions-stats.service'

@Module({
  imports: [DatabaseModule, BooksModule],
  controllers: [ReadingSessionsController],
  providers: [ReadingSessionsService, ReadingSessionsStatsService],
  exports: [ReadingSessionsStatsService],
})
export class ReadingSessionsModule {}
