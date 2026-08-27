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

  find(userId: string) {
    return this.repository.find(userId, this.year)
  }

  async findWithProgress(userId: string) {
    const goal = await this.find(userId)
    const completed = await this.booksService.countCompleted(userId, this.year)
    return { year: this.year, target: goal?.target ?? null, current: completed }
  }

  async upsert(userId: string, target: number) {
    await this.repository.upsert(userId, this.year, target)
    return this.findWithProgress(userId)
  }
}
