import { DrizzleReadingSessionsStatsRepository } from './reading-sessions-stats.drizzle-repository'
import type { Database } from '@/database/database.types'

describe('DrizzleReadingSessionsStatsRepository', () => {
  let repository: DrizzleReadingSessionsStatsRepository
  let db: {
    select: jest.Mock
    selectDistinct: jest.Mock
  }

  beforeEach(() => {
    db = { select: jest.fn(), selectDistinct: jest.fn() }
    repository = new DrizzleReadingSessionsStatsRepository(
      db as unknown as Database,
    )
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
})
