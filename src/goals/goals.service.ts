import { Injectable } from '@nestjs/common'
import { BooksService } from '@/books/books.service'
import { GoalsRepository } from './goals.repository'

@Injectable()
export class GoalsService {
  constructor(
    private readonly repository: GoalsRepository,
    private readonly booksService: BooksService,
  ) {}

  private get year() {
    return new Date().getFullYear()
  }

  find(userId: string, year = this.year) {
    return this.repository.find(userId, year)
  }

  async findWithProgress(userId: string, year = this.year) {
    const goal = await this.find(userId, year)
    const completed = await this.booksService.countCompleted(userId, year)
    return { year, target: goal?.target ?? null, current: completed }
  }

  async upsert(userId: string, target: number) {
    await this.repository.upsert(userId, this.year, target)
    return this.findWithProgress(userId)
  }
}
