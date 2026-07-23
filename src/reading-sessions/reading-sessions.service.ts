import { BooksService } from '@/books/books.service'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import type { NewReadingSession } from './reading-sessions.types'
import { readingSessions } from '@/database/schema/reading-sessions.schema'
import { books } from '@/database/schema/books.schema'
import { eq, and } from 'drizzle-orm'
import type { User } from '@/users/users.types'

@Injectable()
export class ReadingSessionsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly booksService: BooksService,
  ) {}

  async findAll(userId: string) {
    return this.db
      .select({ readingSession: readingSessions })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(eq(books.userId, userId))
      .then((rows) => rows.map((r) => r.readingSession))
  }

  async findOne(id: string, userId: string) {
    const [row] = await this.db
      .select({ readingSession: readingSessions })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(and(eq(readingSessions.id, id), eq(books.userId, userId)))

    if (!row) {
      throw new NotFoundException(`Reading Session with id ${id} not found`)
    }

    return row.readingSession
  }

  async create(
    user: User,
    readingSession: Omit<NewReadingSession, 'durationSeconds'>,
  ) {
    await this.booksService.findOne(readingSession.bookId, user.id)

    if (readingSession.toPage < readingSession.fromPage) {
      throw new BadRequestException(
        'toPage must be greater than or equal to fromPage',
      )
    }

    const pagesRead = readingSession.toPage - readingSession.fromPage + 1
    const durationSeconds = user.readingSpeed
      ? Math.round(pagesRead * user.readingSpeed)
      : 0

    const [created] = await this.db
      .insert(readingSessions)
      .values({ ...readingSession, durationSeconds })
      .returning()

    return created
  }

  async update(
    id: string,
    user: User,
    readingSession: Partial<
      Pick<NewReadingSession, 'fromPage' | 'toPage' | 'readAt'>
    >,
  ) {
    const existing = await this.findOne(id, user.id)

    const fromPage = readingSession.fromPage ?? existing.fromPage
    const toPage = readingSession.toPage ?? existing.toPage

    if (toPage < fromPage) {
      throw new BadRequestException(
        'toPage must be greater than or equal to fromPage',
      )
    }

    const pagesRead = toPage - fromPage + 1
    const durationSeconds = user.readingSpeed
      ? Math.round(pagesRead * user.readingSpeed)
      : 0

    const [updated] = await this.db
      .update(readingSessions)
      .set({ ...readingSession, durationSeconds })
      .where(eq(readingSessions.id, id))
      .returning()

    return updated
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId)

    await this.db.delete(readingSessions).where(eq(readingSessions.id, id))
  }
}
