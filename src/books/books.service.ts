import { DATABASE_CONNECTION } from '@/database/database-connection'
import { books } from '@/database/schema/books.schema'
import type { Database } from '@/database/database.types'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, gte, lt } from 'drizzle-orm'
import type { Book, NewBook } from './books.types'

@Injectable()
export class BooksService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async findAll(userId: string) {
    return this.db.query.books.findMany({
      where: { userId },
    })
  }

  async findOne(id: string, userId: string) {
    const book = await this.db.query.books.findFirst({
      where: { id, userId },
    })

    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`)
    }

    return book
  }

  async create(book: NewBook) {
    const [created] = await this.db.insert(books).values(book).returning()
    return created
  }

  async update(id: string, userId: string, book: Partial<Book>) {
    await this.findOne(id, userId)

    const [updated] = await this.db
      .update(books)
      .set(book)
      .where(eq(books.id, id))
      .returning()

    return updated
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId)

    await this.db.delete(books).where(eq(books.id, id))
  }

  async markAsCompleted(id: string) {
    const [book] = await this.db
      .update(books)
      .set({ status: 'completed' })
      .where(eq(books.id, id))
      .returning()

    return book
  }

  async countCompleted(userId: string, year: number) {
    const startOfYear = new Date(Date.UTC(year, 0, 1))
      .toISOString()
      .split('T')[0]
    const endOfYear = new Date(Date.UTC(year + 1, 0, 1))
      .toISOString()
      .split('T')[0]

    return this.db.$count(
      books,
      and(
        eq(books.userId, userId),
        eq(books.status, 'completed'),
        gte(books.completedAt, startOfYear),
        lt(books.completedAt, endOfYear),
      ),
    )
  }
}
