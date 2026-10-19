import { Module } from '@nestjs/common'
import { BooksModule } from '@/books/books.module'
import { ReadingSessionsModule } from '@/reading-sessions/reading-sessions.module'
import { StatsModule } from '@/stats/stats.module'
import { BookDetailsService } from './book-details.service'

@Module({
  imports: [BooksModule, ReadingSessionsModule, StatsModule],
  providers: [BookDetailsService],
  exports: [BookDetailsService],
})
export class BookDetailsModule {}
