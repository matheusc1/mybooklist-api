import { Test, TestingModule } from '@nestjs/testing'
import { ReadingSessionsStatsService } from '@/reading-sessions/reading-sessions-stats.service'
import { ActivityService } from './activity.service'

describe('ActivityService', () => {
  let service: ActivityService
  let statsService: jest.Mocked<
    Pick<ReadingSessionsStatsService, 'monthlyStats' | 'monthlyActivity'>
  >

  const monthlyStats = {
    sessions: 3,
    pages: 42,
    readingTime: 90,
    activeDays: 2,
  }
  const monthlyActivity = [
    {
      date: '2026-09-01',
      sessions: [
        {
          id: 'session-123',
          bookId: 'book-123',
          title: 'The Hobbit',
          author: 'J. R. R. Tolkien',
          coverUrl: null,
          fromPage: 1,
          toPage: 5,
          duration: 30,
        },
      ],
    },
  ]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: ReadingSessionsStatsService,
          useValue: {
            monthlyStats: jest.fn(),
            monthlyActivity: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ActivityService>(ActivityService)
    statsService = module.get(ReadingSessionsStatsService)
  })

  it('combines monthly statistics and calendar activity for a user and month', async () => {
    statsService.monthlyStats.mockResolvedValue(monthlyStats)
    statsService.monthlyActivity.mockResolvedValue(monthlyActivity)

    await expect(service.getActivity('user-123', '2026-09')).resolves.toEqual({
      monthlyStats,
      monthlyActivity,
    })
    expect(statsService.monthlyStats).toHaveBeenCalledWith(
      'user-123',
      '2026-09',
    )
    expect(statsService.monthlyActivity).toHaveBeenCalledWith(
      'user-123',
      '2026-09',
    )
  })

  it('returns empty dependency results unchanged', async () => {
    statsService.monthlyStats.mockResolvedValue({
      sessions: 0,
      pages: 0,
      readingTime: 0,
      activeDays: 0,
    })
    statsService.monthlyActivity.mockResolvedValue([])

    await expect(service.getActivity('user-123', '2026-02')).resolves.toEqual({
      monthlyStats: {
        sessions: 0,
        pages: 0,
        readingTime: 0,
        activeDays: 0,
      },
      monthlyActivity: [],
    })
  })

  it('propagates monthly statistics errors', async () => {
    statsService.monthlyStats.mockRejectedValue(new Error('stats failed'))
    statsService.monthlyActivity.mockResolvedValue([])

    await expect(service.getActivity('user-123', 'invalid')).rejects.toThrow(
      'stats failed',
    )
  })

  it('propagates monthly activity errors', async () => {
    statsService.monthlyStats.mockResolvedValue(monthlyStats)
    statsService.monthlyActivity.mockRejectedValue(new Error('activity failed'))

    await expect(service.getActivity('user-123', '2026-09')).rejects.toThrow(
      'activity failed',
    )
  })
})
