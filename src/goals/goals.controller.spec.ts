import { Test, TestingModule } from '@nestjs/testing'
import { GoalsController } from './goals.controller'
import { GoalsService } from './goals.service'
import type { User } from '@/users/users.types'

describe('GoalsController', () => {
  let controller: GoalsController
  let goalsService: jest.Mocked<
    Pick<GoalsService, 'findWithProgress' | 'upsert'>
  >

  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: {
            findWithProgress: jest.fn(),
            upsert: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<GoalsController>(GoalsController)
    goalsService = module.get(GoalsService)
  })

  it('returns the authenticated user reading progress', async () => {
    const progress = { year: 2026, target: 50, current: 12 }
    goalsService.findWithProgress.mockResolvedValue(progress)

    await expect(controller.find(user)).resolves.toEqual(progress)
    expect(goalsService.findWithProgress).toHaveBeenCalledWith('user-123')
  })

  it('upserts the requested target for the authenticated user', async () => {
    const dto = { target: 50 }
    const progress = { year: 2026, target: 50, current: 12 }
    goalsService.upsert.mockResolvedValue(progress)

    await expect(controller.upsert(dto, user)).resolves.toEqual(progress)
    expect(goalsService.upsert).toHaveBeenCalledWith('user-123', 50)
  })

  it('propagates service errors', async () => {
    goalsService.upsert.mockRejectedValue(new Error('goal update failed'))

    await expect(controller.upsert({ target: 50 }, user)).rejects.toThrow(
      'goal update failed',
    )
  })
})
