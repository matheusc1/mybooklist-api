import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from '@/books/books.service'
import { ReadingSessionsStatsService } from '@/reading-sessions/reading-sessions-stats.service'
import { DashboardService } from './dashboard.service'

describe('DashboardService', () => {
  let service: DashboardService
  let booksService: jest.Mocked<
    Pick<
      BooksService,
      'findCurrentlyReading' | 'findRecentActivity' | 'findLastCompleted'
    >
  >
  let statsService: jest.Mocked<
    Pick<ReadingSessionsStatsService, 'weeklyStats'>
  >

  const currentlyReading = { id: 'book-current', title: 'Current Book' }
  const recentActivity = [{ id: 'book-recent' }]
  const lastCompleted = [{ id: 'book-completed' }]
  const weeklyStats = {
    pagesByDay: [],
    totalPagesRead: 10,
    totalReadingMinutes: 30,
    mostActiveDay: 'Mon',
    daysStreak: 2,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: BooksService,
          useValue: {
            findCurrentlyReading: jest.fn(),
            findRecentActivity: jest.fn(),
            findLastCompleted: jest.fn(),
          },
        },
        {
          provide: ReadingSessionsStatsService,
          useValue: { weeklyStats: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<DashboardService>(DashboardService)
    booksService = module.get(BooksService)
    statsService = module.get(ReadingSessionsStatsService)
  })

  it('composes the current book, activity, completed books, and weekly stats', async () => {
    booksService.findCurrentlyReading.mockResolvedValue(
      currentlyReading as never,
    )
    booksService.findRecentActivity.mockResolvedValue(recentActivity as never)
    booksService.findLastCompleted.mockResolvedValue(lastCompleted as never)
    statsService.weeklyStats.mockResolvedValue(weeklyStats)

    await expect(service.getDashboard('user-123')).resolves.toEqual({
      currentlyReading,
      recentActivity,
      lastCompleted,
      weeklyStats,
    })

    expect(booksService.findCurrentlyReading).toHaveBeenCalledWith('user-123')
    expect(booksService.findRecentActivity).toHaveBeenCalledWith(
      'user-123',
      3,
      'book-current',
    )
    expect(booksService.findLastCompleted).toHaveBeenCalledWith('user-123', 3)
    expect(statsService.weeklyStats).toHaveBeenCalledWith('user-123')
  })

  it('does not exclude a book from recent activity when none is currently being read', async () => {
    booksService.findCurrentlyReading.mockResolvedValue(undefined)
    booksService.findRecentActivity.mockResolvedValue([])
    booksService.findLastCompleted.mockResolvedValue([])
    statsService.weeklyStats.mockResolvedValue(weeklyStats)

    await expect(service.getDashboard('user-123')).resolves.toEqual({
      currentlyReading: undefined,
      recentActivity: [],
      lastCompleted: [],
      weeklyStats,
    })
    expect(booksService.findRecentActivity).toHaveBeenCalledWith(
      'user-123',
      3,
      undefined,
    )
  })

  it('propagates an error from the initial current-book lookup', async () => {
    booksService.findCurrentlyReading.mockRejectedValue(
      new Error('current book lookup failed'),
    )

    await expect(service.getDashboard('user-123')).rejects.toThrow(
      'current book lookup failed',
    )
    expect(booksService.findRecentActivity).not.toHaveBeenCalled()
    expect(booksService.findLastCompleted).not.toHaveBeenCalled()
    expect(statsService.weeklyStats).not.toHaveBeenCalled()
  })

  it('propagates errors from the composed dashboard requests', async () => {
    booksService.findCurrentlyReading.mockResolvedValue(
      currentlyReading as never,
    )
    booksService.findRecentActivity.mockRejectedValue(
      new Error('activity lookup failed'),
    )
    booksService.findLastCompleted.mockResolvedValue(lastCompleted as never)
    statsService.weeklyStats.mockResolvedValue(weeklyStats)

    await expect(service.getDashboard('user-123')).rejects.toThrow(
      'activity lookup failed',
    )
  })
})
