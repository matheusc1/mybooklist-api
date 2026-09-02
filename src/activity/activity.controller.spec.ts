import { Test, TestingModule } from '@nestjs/testing'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'
import type { User } from '@/users/users.types'

describe('ActivityController', () => {
  let controller: ActivityController
  let activityService: jest.Mocked<Pick<ActivityService, 'getActivity'>>
  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: ActivityService,
          useValue: { getActivity: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get<ActivityController>(ActivityController)
    activityService = module.get(ActivityService)
  })

  it('forwards the authenticated user and requested month', async () => {
    const query = { month: '2026-09' }
    const result = { monthlyStats: {}, monthlyActivity: [] }
    activityService.getActivity.mockResolvedValue(result as never)

    await expect(controller.getActivity(user, query)).resolves.toEqual(result)
    expect(activityService.getActivity).toHaveBeenCalledWith(
      'user-123',
      '2026-09',
    )
  })

  it('propagates service errors', async () => {
    activityService.getActivity.mockRejectedValue(
      new Error('activity lookup failed'),
    )

    await expect(
      controller.getActivity(user, { month: '2026-09' }),
    ).rejects.toThrow('activity lookup failed')
  })
})
