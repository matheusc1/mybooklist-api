import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, gte, lt } from 'drizzle-orm'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database, Transaction } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'
import type { NewBook } from './books.types'
import { BooksRepository } from './books.repository'
import { formatDate } from '@/common/format-date'

@Injectable()
export class DrizzleBooksRepository extends BooksRepository {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {
    super()
  }

  findAll(userId: string) {
    return this.db.query.books.findMany({ where: { userId } })
  }

  findOne(id: string, userId: string) {
    return this.db.query.books.findFirst({ where: { id, userId } })
  }

  async create(book: NewBook) {
    const [created] = await this.db.insert(books).values(book).returning()
    return created
  }

  async update(id: string, book: Partial<NewBook>) {
    const [updated] = await this.db
      .update(books)
      .set(book)
      .where(eq(books.id, id))
      .returning()
    return updated
  }

  async delete(id: string) {
    await this.db.delete(books).where(eq(books.id, id))
  }

  countCompleted(userId: string, year: number) {
    return this.db.$count(
      books,
      and(
        eq(books.userId, userId),
        eq(books.status, 'completed'),
        gte(books.completedAt, formatDate(new Date(year, 0, 1))),
        lt(books.completedAt, formatDate(new Date(year + 1, 0, 1))),
      ),
    )
  }

  findCurrentlyReading(userId: string) {
    return this.db.query.books.findFirst({
      where: { userId, status: 'reading' },
      orderBy: { updatedAt: 'desc' },
    })
  }

  findRecentActivity(userId: string, quantity: number, excludeId?: string) {
    return this.db.query.books.findMany({
      where: excludeId ? { userId, id: { ne: excludeId } } : { userId },
      orderBy: { updatedAt: 'desc' },
      limit: quantity,
    })
  }

  findLastCompleted(userId: string, quantity: number) {
    return this.db.query.books.findMany({
      where: { userId, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      limit: quantity,
    })
  }

  async syncProgress(tx: Transaction, bookId: string, currentPage: number) {
    const book = await tx.query.books.findFirst({ where: { id: bookId } })
    if (!book) throw new NotFoundException(`Book with id ${bookId} not found`)
    const completed = currentPage >= book.totalPages
    const status = completed
      ? 'completed'
      : currentPage > 0
        ? 'reading'
        : book.status
    const startedAt =
      (status === 'reading' || completed) && !book.startedAt
        ? formatDate(new Date())
        : book.startedAt
    const completedAt = completed
      ? (book.completedAt ?? formatDate(new Date()))
      : null
    const [updated] = await tx
      .update(books)
      .set({ currentPage, status, startedAt, completedAt })
      .where(eq(books.id, book.id))
      .returning()
    return updated
  }

  async resetProgress(tx: Transaction, bookId: string) {
    const book = await tx.query.books.findFirst({ where: { id: bookId } })
    if (!book) throw new NotFoundException(`Book with id ${bookId} not found`)

    const [updated] = await tx
      .update(books)
      .set({
        currentPage: 0,
        status: 'planned',
        startedAt: null,
        completedAt: null,
      })
      .where(eq(books.id, book.id))
      .returning()
    return updated
  }
}
