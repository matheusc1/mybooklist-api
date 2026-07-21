import { DATABASE_CONNECTION } from '@/database/database-connection'
import { books } from '@/database/schema/books.schema'
import type { Database } from '@/database/types'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Book, CreateBook } from './books.types'

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

  async createBook(book: CreateBook) {
    const [created] = await this.db.insert(books).values(book).returning()
    return created
  }

  async updateBook(id: string, userId: string, book: Partial<Book>) {
    await this.findOne(id, userId)

    const [updated] = await this.db
      .update(books)
      .set(book)
      .where(eq(books.id, id))
      .returning()

    return updated
  }

  async deleteBook(id: string, userId: string) {
    await this.findOne(id, userId)

    await this.db.delete(books).where(eq(books.id, id))
  }

  async updateStatusIfCompleted(id: string, pageReached: number) {
    const book = await this.db.query.books.findFirst({
      where: { id },
    })

    if (!book) {
      throw new NotFoundException(`Book with id ${id} not found`)
    }

    if (pageReached === book.totalPages) {
      const [updated] = await this.db
        .update(books)
        .set({ status: 'completed' })
        .where(eq(books.id, id))
        .returning()

      return updated
    }
  }
}
