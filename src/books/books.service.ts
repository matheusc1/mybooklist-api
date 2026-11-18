import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { formatDate } from '@/common/format-date'
import { BooksRepository } from './books.repository'
import type { NewBook } from './books.types'

// PartialType makes every DTO field optional, and @IsOptional() also lets
// an explicit null through. These columns are NOT NULL, so null is rejected here.
const NON_NULLABLE_FIELDS = [
  'title',
  'author',
  'genre',
  'totalPages',
  'currentPage',
  'status',
] as const

@Injectable()
export class BooksService {
  constructor(private readonly repository: BooksRepository) {}

  findAll(userId: string) {
    return this.repository.findAll(userId)
  }

  async findOne(id: string, userId: string) {
    const book = await this.repository.findOne(id, userId)
    if (!book) throw new NotFoundException(`Book with id ${id} not found`)
    return book
  }

  async create(book: NewBook) {
    this.assertPageWithinTotal(book.currentPage ?? 0, book.totalPages)
    const data = this.withCoherentCompletedAt(
      book,
      book.status,
      book.startedAt,
      book.completedAt,
    )
    return this.repository.create(data)
  }

  async update(
    id: string,
    userId: string,
    book: Partial<Omit<NewBook, 'userId' | 'id'>>,
  ) {
    this.assertNoNullRequiredFields(book)
    const existing = await this.findOne(id, userId)
    this.assertPageWithinTotal(
      book.currentPage ?? existing.currentPage ?? 0,
      book.totalPages ?? existing.totalPages,
    )
    const data = this.withCoherentCompletedAt(
      book,
      book.status ?? existing.status,
      book.startedAt !== undefined ? book.startedAt : existing.startedAt,
      book.completedAt !== undefined ? book.completedAt : existing.completedAt,
    )
    return this.repository.update(id, data)
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId)
    await this.repository.delete(id)
  }

  countCompleted(userId: string, year: number) {
    return this.repository.countCompleted(userId, year)
  }

  findCurrentlyReading(userId: string) {
    return this.repository.findCurrentlyReading(userId)
  }

  findRecentActivity(userId: string, quantity: number, excludeId?: string) {
    return this.repository.findRecentActivity(userId, quantity, excludeId)
  }

  findLastCompleted(userId: string, quantity: number) {
    return this.repository.findLastCompleted(userId, quantity)
  }

  findCompletedByYear(userId: string, year: number) {
    return this.repository.findCompletedByYear(userId, year)
  }

  // completedAt only exists on a completed book (ADR 003). Receives the payload
  // and the final status and dates (the stored values merged with the payload).
  // A completed book without a date gets today's, and a book that is not
  // completed has the date cleared. Otherwise the payload is returned as is.
  private withCoherentCompletedAt<T extends { completedAt?: string | null }>(
    payload: T,
    status: NewBook['status'],
    startedAt: string | null | undefined,
    completedAt: string | null | undefined,
  ): T {
    if (status === 'completed') {
      if (completedAt) {
        this.assertDatesInOrder(startedAt, completedAt)
        return payload
      }
      return { ...payload, completedAt: formatDate(new Date()) }
    }

    return completedAt != null ? { ...payload, completedAt: null } : payload
  }

  private assertNoNullRequiredFields(book: Partial<NewBook>) {
    for (const field of NON_NULLABLE_FIELDS) {
      if (book[field] === null) {
        throw new BadRequestException(`${field} cannot be null.`)
      }
    }
  }

  private assertPageWithinTotal(currentPage: number, totalPages: number) {
    if (currentPage > totalPages) {
      throw new BadRequestException(
        'Current page cannot be greater than total pages.',
      )
    }
  }

  // Dates are YYYY-MM-DD strings, so lexicographic comparison is correct.
  private assertDatesInOrder(
    startedAt?: string | null,
    completedAt?: string | null,
  ) {
    if (startedAt && completedAt && completedAt < startedAt) {
      throw new BadRequestException(
        'Completed date cannot be before started date.',
      )
    }
  }
}
