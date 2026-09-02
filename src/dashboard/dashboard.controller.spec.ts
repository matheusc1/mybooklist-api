import { Test, TestingModule } from '@nestjs/testing'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import type { User } from '@/users/users.types'

describe('DashboardController', () => {
  let controller: DashboardController
  let dashboardService: jest.Mocked<Pick<DashboardService, 'getDashboard'>>
  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getDashboard: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<DashboardController>(DashboardController)
    dashboardService = module.get(DashboardService)
  })

  it('returns the dashboard for the authenticated user', async () => {
    const dashboard = {
      currentlyReading: undefined,
      recentActivity: [],
      lastCompleted: [],
      weeklyStats: {},
    }
    dashboardService.getDashboard.mockResolvedValue(dashboard as never)

    await expect(controller.getDashboard(user)).resolves.toEqual(dashboard)
    expect(dashboardService.getDashboard).toHaveBeenCalledWith('user-123')
  })

  it('propagates dashboard service errors', async () => {
    dashboardService.getDashboard.mockRejectedValue(
      new Error('dashboard lookup failed'),
    )

    await expect(controller.getDashboard(user)).rejects.toThrow(
      'dashboard lookup failed',
    )
  })
})
