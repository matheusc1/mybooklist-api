import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { BooksService } from '@/books/books.service'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import type { NewReadingSession } from './reading-sessions.types'
import type { User } from '@/users/users.types'

type ReadingSessionUpdate = Partial<
  Pick<NewReadingSession, 'fromPage' | 'toPage' | 'readAt'>
>

// PartialType makes every DTO field optional, and @IsOptional() also lets
// an explicit null through. These columns are NOT NULL, so null is rejected here.
const NON_NULLABLE_FIELDS = ['fromPage', 'toPage', 'readAt'] as const

@Injectable()
export class ReadingSessionsService {
  constructor(
    private readonly repository: ReadingSessionsRepository,
    private readonly booksService: BooksService,
  ) {}

  findAll(userId: string) {
    return this.repository.findAll(userId)
  }

  findByBookId(bookId: string, userId: string) {
    return this.repository.findByBookId(bookId, userId)
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
    const book = await this.booksService.findOne(session.bookId, user.id)
    return this.repository.create(
      session,
      this.calculateDuration(
        session.fromPage,
        session.toPage,
        user.readingSpeed,
        book.totalPages,
      ),
    )
  }

  async update(id: string, user: User, session: ReadingSessionUpdate) {
    this.assertNoNullRequiredFields(session)
    const existing = await this.findOne(id, user.id)
    const book = await this.booksService.findOne(existing.bookId, user.id)
    const fromPage = session.fromPage ?? existing.fromPage
    const toPage = session.toPage ?? existing.toPage
    return this.repository.update(
      id,
      session,
      this.calculateDuration(
        fromPage,
        toPage,
        user.readingSpeed,
        book.totalPages,
      ),
    )
  }

  async delete(id: string, userId: string, resetToPlanned = false) {
    await this.findOne(id, userId)
    return this.repository.delete(id, resetToPlanned)
  }

  private assertNoNullRequiredFields(session: ReadingSessionUpdate) {
    for (const field of NON_NULLABLE_FIELDS) {
      if (session[field] === null) {
        throw new BadRequestException(`${field} cannot be null.`)
      }
    }
  }

  private calculateDuration(
    fromPage: number,
    toPage: number,
    speed: number | null,
    totalPages: number,
  ) {
    if (toPage < fromPage)
      throw new BadRequestException(
        'toPage must be greater than or equal to fromPage',
      )
    if (toPage > totalPages)
      throw new BadRequestException(
        "toPage cannot be greater than the book's totalPages",
      )
    return speed ? Math.round((toPage - fromPage + 1) * speed) : 0
  }
}
