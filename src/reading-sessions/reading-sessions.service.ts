import { BooksService } from '@/books/books.service'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database, Transaction } from '@/database/database.types'
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

    const durationSeconds = this.calculateDuration(
      readingSession.fromPage,
      readingSession.toPage,
      user.readingSpeed,
    )

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(readingSessions)
        .values({ ...readingSession, durationSeconds })
        .returning()

      const latest = await this.findLatestByReadAt(tx, readingSession.bookId)

      if (latest) {
        await this.booksService.syncProgress(
          tx,
          readingSession.bookId,
          latest.toPage,
        )
      }

      return created
    })
  }

  async update(
    id: string,
    user: User,
    readingSession: Partial<Pick<NewReadingSession, 'fromPage' | 'toPage'>>,
  ) {
    const existing = await this.findOne(id, user.id)

    const fromPage = readingSession.fromPage ?? existing.fromPage
    const toPage = readingSession.toPage ?? existing.toPage

    const durationSeconds = this.calculateDuration(
      fromPage,
      toPage,
      user.readingSpeed,
    )

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

  private async findLatestByReadAt(tx: Transaction, bookId: string) {
    const [latest] = await tx.query.readingSessions.findMany({
      where: { bookId },
      orderBy: { readAt: 'desc', updatedAt: 'desc' },
      limit: 1,
    })

    return latest
  }

  private calculateDuration(
    fromPage: number,
    toPage: number,
    readingSpeed: number | null,
  ) {
    if (toPage < fromPage) {
      throw new BadRequestException(
        'toPage must be greater than or equal to fromPage',
      )
    }

    const pagesRead = toPage - fromPage + 1
    const durationSeconds = readingSpeed
      ? Math.round(pagesRead * readingSpeed)
      : 0

    return durationSeconds
  }
}
