import { Injectable } from '@nestjs/common'
import { BooksService } from '@/books/books.service'
import { ReadingSessionsService } from '@/reading-sessions/reading-sessions.service'
import { StatsService } from '@/stats/stats.service'

@Injectable()
export class BookDetailsService {
  constructor(
    private readonly booksService: BooksService,
    private readonly readingSessionsService: ReadingSessionsService,
    private readonly statsService: StatsService,
  ) {}

  async getBookDetails(bookId: string, userId: string) {
    const book = await this.booksService.findOne(bookId, userId)
    const [readingSessions, stats] = await Promise.all([
      this.readingSessionsService.findByBookId(bookId, userId),
      this.statsService.bookStats(bookId, userId),
    ])

    return { book, readingSessions, stats }
  }
}
