import { DrizzleStatsRepository } from './stats.drizzle-repository'
import type { Database } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'
import { and, eq } from 'drizzle-orm'

describe('DrizzleStatsRepository', () => {
  let repository: DrizzleStatsRepository
  let db: {
    select: jest.Mock
    selectDistinct: jest.Mock
  }

  beforeEach(() => {
    db = { select: jest.fn(), selectDistinct: jest.fn() }
    repository = new DrizzleStatsRepository(db as unknown as Database)
  })

  it('maps joined range rows to reading sessions', async () => {
    const session = { id: 'session-123', readAt: '2026-09-01' }
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ readingSession: session }]),
    })

    await expect(
      repository.findInRange('user-123', '2026-09-01', '2026-09-30'),
    ).resolves.toEqual([session])
  })

  it('returns monthly activity rows in database order', async () => {
    const rows = [{ id: 'session-123', date: '2026-09-01', duration: 60 }]
    const orderBy = jest.fn().mockResolvedValue(rows)
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy,
    })

    await expect(
      repository.findMonthlyActivity('user-123', '2026-09-01', '2026-09-30'),
    ).resolves.toEqual(rows)
    expect(orderBy).toHaveBeenCalled()
  })

  it('maps distinct read-date rows to date strings', async () => {
    db.selectDistinct.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest
        .fn()
        .mockResolvedValue([
          { readAt: '2026-09-02' },
          { readAt: '2026-09-01' },
        ]),
    })

    await expect(repository.findDistinctReadDates('user-123')).resolves.toEqual(
      ['2026-09-02', '2026-09-01'],
    )
  })

  it('aggregates session count, reading seconds, and distinct days for an owned book', async () => {
    const aggregate = {
      sessions: 3,
      totalReadingSeconds: '5410',
      activeDays: 2,
    }
    const where = jest.fn().mockResolvedValue([aggregate])
    const selection = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where,
    })
    db.select.mockImplementation(selection)

    await expect(
      repository.findBookStats('book-123', 'user-123'),
    ).resolves.toEqual(aggregate)
    expect(where).toHaveBeenCalledWith(
      and(eq(books.id, 'book-123'), eq(books.userId, 'user-123')),
    )
  })

  it('returns zero totals when an owned book has no sessions', async () => {
    const where = jest
      .fn()
      .mockResolvedValue([
        { sessions: 0, totalReadingSeconds: null, activeDays: 0 },
      ])
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where,
    })

    await expect(
      repository.findBookStats('book-123', 'user-123'),
    ).resolves.toEqual({
      sessions: 0,
      totalReadingSeconds: null,
      activeDays: 0,
    })
  })

  it('returns zero totals for a book that is not owned by the user', async () => {
    const where = jest
      .fn()
      .mockResolvedValue([
        { sessions: 0, totalReadingSeconds: null, activeDays: 0 },
      ])
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where,
    })

    await expect(
      repository.findBookStats('another-users-book', 'user-123'),
    ).resolves.toEqual({
      sessions: 0,
      totalReadingSeconds: null,
      activeDays: 0,
    })
    expect(where).toHaveBeenCalledWith(
      and(eq(books.id, 'another-users-book'), eq(books.userId, 'user-123')),
    )
  })
})
