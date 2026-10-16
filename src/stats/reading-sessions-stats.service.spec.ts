/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsStatsRepository } from './reading-sessions-stats.repository'
import { ReadingSessionsStatsService } from './reading-sessions-stats.service'

describe('ReadingSessionsStatsService', () => {
  let service: ReadingSessionsStatsService
  let repository: jest.Mocked<ReadingSessionsStatsRepository>

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
        ReadingSessionsStatsService,
        {
          provide: ReadingSessionsStatsRepository,
          useValue: {
            findInRange: jest.fn(),
            findMonthlyActivity: jest.fn(),
            findDistinctReadDates: jest.fn(),
          },
        },
      ],
    }).compile()
    service = module.get(ReadingSessionsStatsService)
    repository = module.get(ReadingSessionsStatsRepository)
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

  it('rejects invalid month formats', async () => {
    await expect(service.monthlyStats('user-123', '2026-2')).rejects.toThrow(
      new BadRequestException('month must be in YYYY-MM format'),
    )
    expect(repository.findInRange).not.toHaveBeenCalled()
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
