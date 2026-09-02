import { DrizzleGoalsRepository } from './goals.drizzle-repository'
import { goals } from '@/database/schema/goals.schema'
import type { Database } from '@/database/database.types'

type MockDatabase = {
  query: {
    goals: {
      findFirst: jest.Mock
    }
  }
  insert: jest.Mock
}

describe('DrizzleGoalsRepository', () => {
  let repository: DrizzleGoalsRepository
  let db: MockDatabase

  beforeEach(() => {
    db = {
      query: {
        goals: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
    }

    repository = new DrizzleGoalsRepository(db as unknown as Database)
  })

  it('finds a goal by user and year', async () => {
    const goal = { id: 'goal-123', userId: 'user-123', year: 2026, target: 50 }
    db.query.goals.findFirst.mockResolvedValue(goal)

    await expect(repository.find('user-123', 2026)).resolves.toEqual(goal)
    expect(db.query.goals.findFirst).toHaveBeenCalledWith({
      where: { year: 2026, userId: 'user-123' },
    })
  })

  it('returns undefined when no goal exists for the user and year', async () => {
    db.query.goals.findFirst.mockResolvedValue(undefined)

    await expect(repository.find('user-123', 2026)).resolves.toBeUndefined()
  })

  it('inserts a new goal with an upsert conflict target', async () => {
    const insertQuery = {
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
    }
    db.insert.mockReturnValue(insertQuery)

    await expect(
      repository.upsert('user-123', 2026, 50),
    ).resolves.toBeUndefined()
    expect(insertQuery.values).toHaveBeenCalledWith({
      userId: 'user-123',
      year: 2026,
      target: 50,
    })
    expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledWith({
      target: [goals.userId, goals.year],
      set: { target: 50 },
    })
  })

  it('propagates database errors during upsert', async () => {
    const insertQuery = {
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest
        .fn()
        .mockRejectedValue(new Error('database unavailable')),
    }
    db.insert.mockReturnValue(insertQuery)

    await expect(repository.upsert('user-123', 2026, 50)).rejects.toThrow(
      'database unavailable',
    )
  })
})
