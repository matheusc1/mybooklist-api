import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { BooksRepository } from './books.repository'
import type { NewBook } from './books.types'

@Injectable()
export class BooksService {
  constructor(
    private readonly repository: BooksRepository,
  ) {}
  findAll(userId: string) {
    return this.repository.findAll(userId)
  }
  async findOne(id: string, userId: string) {
    const book = await this.repository.findOne(id, userId)
    if (!book) throw new NotFoundException(`Book with id ${id} not found`)
    return book
  }
  async create(book: NewBook) {
    if ((book.currentPage ?? 0) > book.totalPages)
      throw new BadRequestException(
        'Current page cannot be greater than total pages.',
      )
    return this.repository.create(book)
  }
  async update(id: string, userId: string, book: Partial<NewBook>) {
    const existing = await this.findOne(id, userId)
    if (
      (book.currentPage ?? existing.currentPage ?? 0) >
      (book.totalPages ?? existing.totalPages)
    )
      throw new BadRequestException(
        'Current page cannot be greater than total pages.',
      )
    return this.repository.update(id, book)
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
}
