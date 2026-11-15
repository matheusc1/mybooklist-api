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
    const data: NewUser = {
      provider: 'google',
      providerId: 'google-123',
      email: 'user@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
      readingSpeed: 90,
    }

    const makeInsertQuery = (rows: User[]) => ({
      values: jest.fn().mockReturnThis(),
      onConflictDoUpdate: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue(rows),
    })

    it('inserts the user and returns the row', async () => {
      const insertQuery = makeInsertQuery([mockUser])
      db.insert.mockReturnValue(insertQuery)

      await expect(repository.create(data)).resolves.toEqual(mockUser)
      expect(db.insert).toHaveBeenCalledTimes(1)
      expect(insertQuery.values).toHaveBeenCalledWith(data)
    })

    it('refreshes only the provider profile fields when the account already exists', async () => {
      const insertQuery = makeInsertQuery([mockUser])
      db.insert.mockReturnValue(insertQuery)

      await repository.create(data)

      // readingSpeed is not in the update set, so it is never overwritten.
      expect(insertQuery.onConflictDoUpdate).toHaveBeenCalledWith({
        target: [users.provider, users.providerId],
        set: {
          email: data.email,
          name: data.name,
          avatarUrl: data.avatarUrl,
        },
      })
    })

    it('returns the refreshed row for a repeated login', async () => {
      const refreshed = { ...mockUser, name: 'New Name' }
      db.insert.mockReturnValue(makeInsertQuery([refreshed]))

      await expect(
        repository.create({ ...data, name: 'New Name' }),
      ).resolves.toEqual(refreshed)
    })

    it('propagates insert errors', async () => {
      const insertQuery = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('insert failed')),
      }
      db.insert.mockReturnValue(insertQuery)

      await expect(repository.create(data)).rejects.toThrow('insert failed')
    })
  })

  describe('update', () => {
    it('updates an existing user', async () => {
      const updateData: Pick<NewUser, 'readingSpeed'> = { readingSpeed: 120 }
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
