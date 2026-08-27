import type { Book, NewBook } from './books.types'
import type { Transaction } from '@/database/database.types'

export abstract class BooksRepository {
  abstract findAll(userId: string): Promise<Book[]>

  abstract findOne(id: string, userId: string): Promise<Book | undefined>

  abstract create(book: NewBook): Promise<Book>

  abstract update(id: string, book: Partial<NewBook>): Promise<Book | undefined>

  abstract delete(id: string): Promise<void>

  abstract countCompleted(userId: string, year: number): Promise<number>

  abstract findCurrentlyReading(userId: string): Promise<Book | undefined>

  abstract findRecentActivity(
    userId: string,
    quantity: number,
    excludeId?: string,
  ): Promise<Book[]>

  abstract findLastCompleted(userId: string, quantity: number): Promise<Book[]>

  abstract syncProgress(
    tx: Transaction,
    bookId: string,
    currentPage: number,
  ): Promise<Book | undefined>

  abstract resetProgress(
    tx: Transaction,
    bookId: string,
  ): Promise<Book | undefined>
}
