/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { StatsRepository } from './stats.repository'
import { StatsService } from './stats.service'

describe('StatsService', () => {
  let service: StatsService
  let repository: jest.Mocked<StatsRepository>

  const session = (
    readAt: string,
    fromPage: number,
    toPage: number,
    durationSeconds: number,
  ) => ({
    id: `${readAt}-${fromPage}`,
    bookId: 'book-123',
    fromPage,
    toPage,
    durationSeconds,
    readAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-02T12:00:00.000Z'))
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: StatsRepository,
          useValue: {
            findInRange: jest.fn(),
            findMonthlyActivity: jest.fn(),
            findDistinctReadDates: jest.fn(),
            findBookStats: jest.fn(),
          },
        },
      ],
    }).compile()
    service = module.get(StatsService)
    repository = module.get(StatsRepository)
  })

  afterEach(() => jest.useRealTimers())

  it('aggregates weekly pages, minutes, active day, and streak', async () => {
    repository.findInRange.mockResolvedValue([
      session('2026-08-31', 1, 10, 600),
      session('2026-09-02', 11, 20, 300),
    ])
    repository.findDistinctReadDates.mockResolvedValue([
      '2026-09-02',
      '2026-09-01',
      '2026-08-31',
    ])

    await expect(service.weeklyStats('user-123')).resolves.toEqual({
      pagesByDay: [
        { day: 'Mon', pages: 10 },
        { day: 'Tue', pages: 0 },
        { day: 'Wed', pages: 10 },
        { day: 'Thu', pages: 0 },
        { day: 'Fri', pages: 0 },
        { day: 'Sat', pages: 0 },
        { day: 'Sun', pages: 0 },
      ],
      totalPagesRead: 20,
      totalReadingMinutes: 15,
      mostActiveDay: 'Mon',
      daysStreak: 3,
    })
    expect(repository.findInRange).toHaveBeenCalledWith(
      'user-123',
      '2026-08-31',
      '2026-09-06',
    )
  })

  it('returns zeroed weekly statistics for empty data', async () => {
    repository.findInRange.mockResolvedValue([])
    repository.findDistinctReadDates.mockResolvedValue([])

    await expect(service.weeklyStats('user-123')).resolves.toMatchObject({
      totalPagesRead: 0,
      totalReadingMinutes: 0,
      mostActiveDay: null,
      daysStreak: 0,
    })
  })

  it('aggregates monthly sessions and counts distinct active days', async () => {
    repository.findInRange.mockResolvedValue([
      session('2026-02-01', 1, 5, 31),
      session('2026-02-01', 6, 10, 30),
      session('2026-02-28', 1, 1, 59),
    ])

    await expect(service.monthlyStats('user-123', '2026-02')).resolves.toEqual({
      sessions: 3,
      pages: 11,
      readingTime: 2,
      activeDays: 2,
    })
    expect(repository.findInRange).toHaveBeenCalledWith(
      'user-123',
      '2026-02-01',
      '2026-02-28',
    )
  })

  it('returns total book reading time in rounded minutes, session count, and active days', async () => {
    repository.findBookStats.mockResolvedValue({
      sessions: 3,
      totalReadingSeconds: '5410',
      activeDays: 2,
    })

    await expect(service.bookStats('book-123', 'user-123')).resolves.toEqual({
      sessions: 3,
      readingTime: 90,
      activeDays: 2,
    })
    expect(repository.findBookStats).toHaveBeenCalledWith(
      'book-123',
      'user-123',
    )
  })

  it('returns zeroed book stats when the book has no reading sessions', async () => {
    repository.findBookStats.mockResolvedValue({
      sessions: 0,
      totalReadingSeconds: null,
      activeDays: 0,
    })

    await expect(service.bookStats('book-123', 'user-123')).resolves.toEqual({
      sessions: 0,
      readingTime: 0,
      activeDays: 0,
    })
  })

  it('rejects invalid month formats', async () => {
    await expect(service.monthlyStats('user-123', '2026-2')).rejects.toThrow(
      new BadRequestException('month must be in YYYY-MM format'),
    )
    expect(repository.findInRange).not.toHaveBeenCalled()
  })

  it('aggregates yearly sessions and pages read per month', async () => {
    repository.findInRange.mockResolvedValue([
      session('2025-01-01', 1, 10, 600),
      session('2025-01-01', 11, 20, 300),
      session('2025-06-15', 1, 3, 90),
      session('2025-12-31', 1, 5, 30),
    ])

    await expect(service.yearlyStats('user-123', 2025)).resolves.toEqual({
      sessions: 4,
      pages: 28,
      readingTime: 17,
      activeDays: 3,
      pagesByMonth: [20, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 5],
    })
    expect(repository.findInRange).toHaveBeenCalledWith(
      'user-123',
      '2025-01-01',
      '2025-12-31',
    )
  })

  it('returns zeroed yearly stats with 12 months for a year without data', async () => {
    repository.findInRange.mockResolvedValue([])

    await expect(service.yearlyStats('user-123', 2024)).resolves.toEqual({
      sessions: 0,
      pages: 0,
      readingTime: 0,
      activeDays: 0,
      pagesByMonth: Array(12).fill(0),
    })
  })

  it('groups monthly activity by date and converts duration to minutes', async () => {
    repository.findMonthlyActivity.mockResolvedValue([
      {
        id: 'session-1',
        date: '2026-02-01',
        bookId: 'book-123',
        title: 'Book',
        author: 'Author',
        coverUrl: null,
        fromPage: 1,
        toPage: 5,
        duration: 90,
      },
      {
        id: 'session-2',
        date: '2026-02-01',
        bookId: 'book-123',
        title: 'Book',
        author: 'Author',
        coverUrl: null,
        fromPage: 6,
        toPage: 10,
        duration: 30,
      },
    ])

    await expect(
      service.monthlyActivity('user-123', '2026-02'),
    ).resolves.toEqual([
      {
        date: '2026-02-01',
        sessions: [
          expect.objectContaining({ id: 'session-1', duration: 2 }),
          expect.objectContaining({ id: 'session-2', duration: 1 }),
        ],
      },
    ])
  })

  it('counts a streak from yesterday when today has no reading', async () => {
    repository.findInRange.mockResolvedValue([])
    repository.findDistinctReadDates.mockResolvedValue([
      '2026-09-01',
      '2026-08-31',
    ])

    await expect(service.weeklyStats('user-123')).resolves.toMatchObject({
      daysStreak: 2,
    })
  })
})
