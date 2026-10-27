import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from '@/books/books.service'
import { GoalsService } from '@/goals/goals.service'
import { StatsService } from '@/stats/stats.service'
import { YearlyOverviewService } from './yearly-overview.service'

describe('YearlyOverviewService', () => {
  let service: YearlyOverviewService
  let goalsService: jest.Mocked<Pick<GoalsService, 'findWithProgress'>>
  let statsService: jest.Mocked<Pick<StatsService, 'yearlyStats'>>
  let booksService: jest.Mocked<Pick<BooksService, 'findCompletedByYear'>>

  const goal = { year: 2025, target: 30, current: 28 }
  const yearlyStats = {
    sessions: 140,
    pages: 5200,
    readingTime: 3600,
    activeDays: 96,
    pagesByMonth: [320, 410, 0, 280, 500, 390, 450, 0, 610, 380, 420, 300],
  }
  const completedBooks = [{ id: 'book-1' }, { id: 'book-2' }]

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YearlyOverviewService,
        {
          provide: GoalsService,
          useValue: { findWithProgress: jest.fn() },
        },
        {
          provide: StatsService,
          useValue: { yearlyStats: jest.fn() },
        },
        {
          provide: BooksService,
          useValue: { findCompletedByYear: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<YearlyOverviewService>(YearlyOverviewService)
    goalsService = module.get(GoalsService)
    statsService = module.get(StatsService)
    booksService = module.get(BooksService)
  })

  it('composes the goal, yearly stats, and completed books of the requested year', async () => {
    goalsService.findWithProgress.mockResolvedValue(goal)
    statsService.yearlyStats.mockResolvedValue(yearlyStats)
    booksService.findCompletedByYear.mockResolvedValue(completedBooks as never)

    await expect(service.getYearlyOverview('user-123', 2025)).resolves.toEqual({
      goal,
      yearlyStats,
      completedBooks,
    })
    expect(goalsService.findWithProgress).toHaveBeenCalledWith('user-123', 2025)
    expect(statsService.yearlyStats).toHaveBeenCalledWith('user-123', 2025)
    expect(booksService.findCompletedByYear).toHaveBeenCalledWith(
      'user-123',
      2025,
    )
  })

  it('returns empty dependency results unchanged for a year without data', async () => {
    const emptyGoal = { year: 2024, target: null, current: 0 }
    const emptyStats = {
      sessions: 0,
      pages: 0,
      readingTime: 0,
      activeDays: 0,
      pagesByMonth: Array(12).fill(0) as number[],
    }
    goalsService.findWithProgress.mockResolvedValue(emptyGoal)
    statsService.yearlyStats.mockResolvedValue(emptyStats)
    booksService.findCompletedByYear.mockResolvedValue([])

    await expect(service.getYearlyOverview('user-123', 2024)).resolves.toEqual({
      goal: emptyGoal,
      yearlyStats: emptyStats,
      completedBooks: [],
    })
  })

  it('propagates errors from the composed requests', async () => {
    goalsService.findWithProgress.mockResolvedValue(goal)
    statsService.yearlyStats.mockRejectedValue(new Error('stats failed'))
    booksService.findCompletedByYear.mockResolvedValue([])

    await expect(service.getYearlyOverview('user-123', 2025)).rejects.toThrow(
      'stats failed',
    )
  })
})
