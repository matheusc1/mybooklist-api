import { NotFoundException } from '@nestjs/common'
import { DrizzleUsersRepository } from './users.drizzle-repository'
import type { NewUser, User } from './users.types'
import { users } from '@/database/schema/users.schema'
import type { Database } from '@/database/database.types'

type MockDatabase = {
  query: {
    users: {
      findFirst: jest.Mock
    }
  }
  insert: jest.Mock
  update: jest.Mock
}

describe('DrizzleUsersRepository', () => {
  const mockUser: User = {
    id: 'user-123',
    provider: 'google',
    providerId: 'google-123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    readingSpeed: 90,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  let repository: DrizzleUsersRepository
  let db: MockDatabase

  beforeEach(() => {
    db = {
      query: {
        users: {
          findFirst: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
    }

    repository = new DrizzleUsersRepository(db as unknown as Database)
  })

  describe('findById', () => {
    it('finds a user by id', async () => {
      db.query.users.findFirst.mockResolvedValue(mockUser)

      await expect(repository.findById('user-123')).resolves.toEqual(mockUser)
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      })
    })

    it('returns undefined when no user matches the id', async () => {
      db.query.users.findFirst.mockResolvedValue(undefined)

      await expect(repository.findById('missing-user')).resolves.toBeUndefined()
    })
  })

  describe('findByProvider', () => {
    it('finds a user by provider credentials', async () => {
      db.query.users.findFirst.mockResolvedValue(mockUser)

      await expect(
        repository.findByProvider('google', 'google-123'),
      ).resolves.toEqual(mockUser)
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: { provider: 'google', providerId: 'google-123' },
      })
    })

    it('returns undefined when no user matches the provider credentials', async () => {
      db.query.users.findFirst.mockResolvedValue(undefined)

      await expect(
        repository.findByProvider('google', 'unknown-id'),
      ).resolves.toBeUndefined()
    })
  })

  describe('create', () => {
    it('creates a user when the insert succeeds', async () => {
      const data: NewUser = {
        provider: 'github',
        providerId: 'github-456',
        email: 'github-user@example.com',
        name: 'Github User',
        avatarUrl: null,
        readingSpeed: null,
      }
      const insertQuery = {
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser]),
      }
      db.insert.mockReturnValue(insertQuery)

      await expect(repository.create(data)).resolves.toEqual(mockUser)
      expect(db.insert).toHaveBeenCalledTimes(1)
      expect(insertQuery.onConflictDoNothing).toHaveBeenCalledWith({
        target: [users.provider, users.providerId],
      })
    })

    it('reuses the existing user when the insert conflicts and the user already exists', async () => {
      const data: NewUser = {
        provider: 'google',
        providerId: 'google-123',
        email: 'user@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        readingSpeed: 90,
      }
      const insertQuery = {
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      }
      db.insert.mockReturnValue(insertQuery)
      db.query.users.findFirst.mockResolvedValue(mockUser)

      await expect(repository.create(data)).resolves.toEqual(mockUser)
      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: { provider: data.provider, providerId: data.providerId },
      })
    })

    it('throws an error when the create operation cannot return a row and no existing user is found', async () => {
      const data: NewUser = {
        provider: 'google',
        providerId: 'google-456',
        email: 'new-user@example.com',
        name: 'New User',
        avatarUrl: null,
        readingSpeed: null,
      }
      const insertQuery = {
        values: jest.fn().mockReturnThis(),
        onConflictDoNothing: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      }
      db.insert.mockReturnValue(insertQuery)
      db.query.users.findFirst.mockResolvedValue(undefined)

      await expect(repository.create(data)).rejects.toThrow(
        'Failed to create or retrieve user',
      )
    })
  })

  describe('update', () => {
    it('updates an existing user', async () => {
      const updateData: Partial<NewUser> = { readingSpeed: 120 }
      const updatedUser = { ...mockUser, readingSpeed: 120 }
      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedUser]),
      }
      db.update.mockReturnValue(updateQuery)

      await expect(repository.update('user-123', updateData)).resolves.toEqual(
        updatedUser,
      )
      expect(db.update).toHaveBeenCalledTimes(1)
      expect(updateQuery.set).toHaveBeenCalledWith(updateData)
    })

    it('throws NotFoundException when updating a missing user', async () => {
      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      }
      db.update.mockReturnValue(updateQuery)

      const promise = repository.update('missing-user', {
        readingSpeed: 120,
      })

      await expect(promise).rejects.toThrow(NotFoundException)
      await expect(promise).rejects.toThrow(
        'User with id missing-user not found',
      )
    })
  })
})
