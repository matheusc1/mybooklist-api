import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { BooksService } from '@/books/books.service'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import type { NewReadingSession } from './reading-sessions.types'
import type { User } from '@/users/users.types'

@Injectable()
export class ReadingSessionsService {
  constructor(
    private readonly repository: ReadingSessionsRepository,
    private readonly booksService: BooksService,
  ) {}

  findAll(userId: string) {
    return this.repository.findAll(userId)
  }

  async findOne(id: string, userId: string) {
    const session = await this.repository.findOne(id, userId)
    if (!session)
      throw new NotFoundException(`Reading Session with id ${id} not found`)
    return session
  }

  async create(
    user: User,
    session: Omit<NewReadingSession, 'durationSeconds'>,
  ) {
    await this.booksService.findOne(session.bookId, user.id)
    return this.repository.create(
      session,
      this.calculateDuration(
        session.fromPage,
        session.toPage,
        user.readingSpeed,
      ),
    )
  }

  async update(
    id: string,
    user: User,
    session: Partial<Pick<NewReadingSession, 'fromPage' | 'toPage' | 'readAt'>>,
  ) {
    const existing = await this.findOne(id, user.id)
    const fromPage = session.fromPage ?? existing.fromPage
    const toPage = session.toPage ?? existing.toPage
    return this.repository.update(
      id,
      session,
      this.calculateDuration(fromPage, toPage, user.readingSpeed),
    )
  }

  async delete(id: string, userId: string, resetToPlanned = false) {
    await this.findOne(id, userId)
    return this.repository.delete(id, resetToPlanned)
  }

  private calculateDuration(
    fromPage: number,
    toPage: number,
    speed: number | null,
  ) {
    if (toPage < fromPage)
      throw new BadRequestException(
        'toPage must be greater than or equal to fromPage',
      )
    return speed ? Math.round((toPage - fromPage + 1) * speed) : 0
  }
}
