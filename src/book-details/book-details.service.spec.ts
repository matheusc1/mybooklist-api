import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from '@/books/books.service'
import { ReadingSessionsService } from '@/reading-sessions/reading-sessions.service'
import { StatsService } from '@/stats/stats.service'
import { BookDetailsService } from './book-details.service'

describe('BookDetailsService', () => {
  let service: BookDetailsService
  let booksService: jest.Mocked<Pick<BooksService, 'findOne'>>
  let readingSessionsService: jest.Mocked<
    Pick<ReadingSessionsService, 'findByBookId'>
  >
  let statsService: jest.Mocked<Pick<StatsService, 'bookStats'>>

  const book = { id: 'book-123', title: 'The Hobbit' }
  const readingSessions = [{ id: 'session-123', bookId: 'book-123' }]
  const stats = { sessions: 1, readingTime: 10, activeDays: 1 }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookDetailsService,
        { provide: BooksService, useValue: { findOne: jest.fn() } },
        {
          provide: ReadingSessionsService,
          useValue: { findByBookId: jest.fn() },
        },
        { provide: StatsService, useValue: { bookStats: jest.fn() } },
      ],
    }).compile()

    service = module.get(BookDetailsService)
    booksService = module.get(BooksService)
    readingSessionsService = module.get(ReadingSessionsService)
    statsService = module.get(StatsService)
  })

  it('composes the owned book, its sessions, and its statistics', async () => {
    booksService.findOne.mockResolvedValue(book as never)
    readingSessionsService.findByBookId.mockResolvedValue(
      readingSessions as never,
    )
    statsService.bookStats.mockResolvedValue(stats)

    await expect(
      service.getBookDetails('book-123', 'user-123'),
    ).resolves.toEqual({ book, readingSessions, stats })

    expect(booksService.findOne).toHaveBeenCalledWith('book-123', 'user-123')
    expect(readingSessionsService.findByBookId).toHaveBeenCalledWith(
      'book-123',
      'user-123',
    )
    expect(statsService.bookStats).toHaveBeenCalledWith('book-123', 'user-123')
  })

  it('does not request sessions or stats for a missing or unauthorized book', async () => {
    booksService.findOne.mockRejectedValue(
      new NotFoundException('Book not found'),
    )

    await expect(
      service.getBookDetails('book-123', 'other-user'),
    ).rejects.toThrow(NotFoundException)

    expect(readingSessionsService.findByBookId).not.toHaveBeenCalled()
    expect(statsService.bookStats).not.toHaveBeenCalled()
  })
})
