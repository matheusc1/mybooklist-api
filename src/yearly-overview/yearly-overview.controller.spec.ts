import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@/users/users.types'
import { YearlyOverviewController } from './yearly-overview.controller'
import { YearlyOverviewService } from './yearly-overview.service'

describe('YearlyOverviewController', () => {
  let controller: YearlyOverviewController
  let yearlyOverviewService: jest.Mocked<
    Pick<YearlyOverviewService, 'getYearlyOverview'>
  >
  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YearlyOverviewController],
      providers: [
        {
          provide: YearlyOverviewService,
          useValue: { getYearlyOverview: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<YearlyOverviewController>(YearlyOverviewController)
    yearlyOverviewService = module.get(YearlyOverviewService)
  })

  it('forwards the authenticated user and requested year', async () => {
    const overview = { goal: {}, yearlyStats: {}, completedBooks: [] }
    yearlyOverviewService.getYearlyOverview.mockResolvedValue(overview as never)

    await expect(
      controller.getYearlyOverview(user, { year: 2025 }),
    ).resolves.toEqual(overview)
    expect(yearlyOverviewService.getYearlyOverview).toHaveBeenCalledWith(
      'user-123',
      2025,
    )
  })

  it('propagates service errors', async () => {
    yearlyOverviewService.getYearlyOverview.mockRejectedValue(
      new Error('overview lookup failed'),
    )

    await expect(
      controller.getYearlyOverview(user, { year: 2025 }),
    ).rejects.toThrow('overview lookup failed')
  })
})
