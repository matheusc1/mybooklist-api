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
    this.assertDatesInOrder(book.startedAt, book.completedAt)
    const data =
      book.status === 'completed' && !book.completedAt
        ? { ...book, completedAt: formatDate(new Date()) }
        : book
    return this.repository.create(data)
  }

  async update(id: string, userId: string, book: Partial<NewBook>) {
    this.assertNoNullRequiredFields(book)
    const existing = await this.findOne(id, userId)
    this.assertPageWithinTotal(
      book.currentPage ?? existing.currentPage ?? 0,
      book.totalPages ?? existing.totalPages,
    )
    const completedAt =
      book.completedAt !== undefined ? book.completedAt : existing.completedAt
    this.assertDatesInOrder(
      book.startedAt !== undefined ? book.startedAt : existing.startedAt,
      completedAt,
    )
    const status = book.status ?? existing.status
    const data =
      status === 'completed' && !completedAt
        ? { ...book, completedAt: formatDate(new Date()) }
        : book
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
