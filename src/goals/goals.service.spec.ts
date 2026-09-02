import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from '@/books/books.service'
import { GoalsRepository } from './goals.repository'
import { GoalsService } from './goals.service'
import type { Goal } from './goals.types'

describe('GoalsService', () => {
  let service: GoalsService
  let repository: jest.Mocked<Pick<GoalsRepository, 'find' | 'upsert'>>
  let booksService: jest.Mocked<Pick<BooksService, 'countCompleted'>>

  const goal: Goal = {
    id: 'goal-123',
    userId: 'user-123',
    year: 2026,
    target: 50,
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-02T12:00:00.000Z'))

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: GoalsRepository,
          useValue: { find: jest.fn(), upsert: jest.fn() },
        },
        {
          provide: BooksService,
          useValue: { countCompleted: jest.fn() },
        },
      ],
    }).compile()

    service = module.get<GoalsService>(GoalsService)
    repository = module.get(GoalsRepository)
    booksService = module.get(BooksService)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('finds the current-year goal for a user', async () => {
    repository.find.mockResolvedValue(goal)

    await expect(service.find('user-123')).resolves.toEqual(goal)
    expect(repository.find).toHaveBeenCalledWith('user-123', 2026)
  })

  it('combines a configured goal with the current completed-book count', async () => {
    repository.find.mockResolvedValue(goal)
    booksService.countCompleted.mockResolvedValue(12)

    await expect(service.findWithProgress('user-123')).resolves.toEqual({
      year: 2026,
      target: 50,
      current: 12,
    })
    expect(repository.find).toHaveBeenCalledWith('user-123', 2026)
    expect(booksService.countCompleted).toHaveBeenCalledWith('user-123', 2026)
  })

  it('returns a null target when no goal is configured', async () => {
    repository.find.mockResolvedValue(undefined)
    booksService.countCompleted.mockResolvedValue(0)

    await expect(service.findWithProgress('user-123')).resolves.toEqual({
      year: 2026,
      target: null,
      current: 0,
    })
  })

  it('upserts the current-year target and returns refreshed progress', async () => {
    repository.upsert.mockResolvedValue()
    repository.find.mockResolvedValue({ ...goal, target: 60 })
    booksService.countCompleted.mockResolvedValue(15)

    await expect(service.upsert('user-123', 60)).resolves.toEqual({
      year: 2026,
      target: 60,
      current: 15,
    })
    expect(repository.upsert).toHaveBeenCalledWith('user-123', 2026, 60)
    expect(repository.find).toHaveBeenCalledWith('user-123', 2026)
    expect(booksService.countCompleted).toHaveBeenCalledWith('user-123', 2026)
  })

  it('does not refresh progress when saving the goal fails', async () => {
    repository.upsert.mockRejectedValue(new Error('goal save failed'))

    await expect(service.upsert('user-123', 50)).rejects.toThrow(
      'goal save failed',
    )
    expect(repository.find).not.toHaveBeenCalled()
    expect(booksService.countCompleted).not.toHaveBeenCalled()
  })

  it('propagates dependency errors while calculating progress', async () => {
    repository.find.mockResolvedValue(goal)
    booksService.countCompleted.mockRejectedValue(
      new Error('book count failed'),
    )

    await expect(service.findWithProgress('user-123')).rejects.toThrow(
      'book count failed',
    )
  })
})
