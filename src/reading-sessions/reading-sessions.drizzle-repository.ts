import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database, Transaction } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'
import { readingSessions } from '@/database/schema/reading-sessions.schema'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import type {
  NewReadingSession,
  ReadingSession,
} from './reading-sessions.types'
import { BooksRepository } from '@/books/books.repository'

@Injectable()
export class DrizzleReadingSessionsRepository extends ReadingSessionsRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly books: BooksRepository,
  ) {
    super()
  }
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
    return row?.readingSession
  }
  private async latest(tx: Transaction, bookId: string) {
    const [row] = await tx.query.readingSessions.findMany({
      where: { bookId },
      orderBy: { readAt: 'desc', updatedAt: 'desc' },
      limit: 1,
    })
    return row
  }
  async create(
    session: Omit<NewReadingSession, 'durationSeconds'>,
    durationSeconds: number,
  ): Promise<ReadingSession> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(readingSessions)
        .values({ ...session, durationSeconds })
        .returning()
      const latest = await this.latest(tx, session.bookId)
      if (latest)
        await this.books.syncProgress(tx, session.bookId, latest.toPage)
      return created
    })
  }
  async update(
    id: string,
    data: Partial<Pick<NewReadingSession, 'fromPage' | 'toPage' | 'readAt'>>,
    durationSeconds: number,
  ): Promise<ReadingSession | undefined> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(readingSessions)
        .set({ ...data, durationSeconds })
        .where(eq(readingSessions.id, id))
        .returning()
      const [existing] = await tx.query.readingSessions.findMany({
        where: { id },
        limit: 1,
      })
      if (existing) {
        const latest = await this.latest(tx, existing.bookId)
        if (latest)
          await this.books.syncProgress(tx, existing.bookId, latest.toPage)
      }
      return updated
    })
  }
  async delete(id: string, resetToPlanned: boolean) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.query.readingSessions.findMany({
        where: { id },
        limit: 1,
      })
      if (!existing) return
      await tx.delete(readingSessions).where(eq(readingSessions.id, id))
      const latest = await this.latest(tx, existing.bookId)
      if (latest)
        await this.books.syncProgress(tx, existing.bookId, latest.toPage)
      else if (resetToPlanned)
        await this.books.resetProgress(tx, existing.bookId)
    })
  }
}
