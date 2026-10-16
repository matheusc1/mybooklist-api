import { Module } from '@nestjs/common'
import { ReadingSessionsController } from './reading-sessions.controller'
import { ReadingSessionsService } from './reading-sessions.service'
import { DatabaseModule } from '@/database/database.module'
import { BooksModule } from '@/books/books.module'
import { DrizzleReadingSessionsRepository } from './reading-sessions.drizzle-repository'
import { ReadingSessionsRepository } from './reading-sessions.repository'

@Module({
  imports: [DatabaseModule, BooksModule],
  controllers: [ReadingSessionsController],
  providers: [
    ReadingSessionsService,
    DrizzleReadingSessionsRepository,
    {
      provide: ReadingSessionsRepository,
      useExisting: DrizzleReadingSessionsRepository,
    },
  ],
})
export class ReadingSessionsModule {}
