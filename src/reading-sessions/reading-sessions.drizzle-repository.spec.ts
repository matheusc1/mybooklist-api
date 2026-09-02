import { Test, TestingModule } from '@nestjs/testing'
import { BooksRepository } from '@/books/books.repository'
import { DATABASE_CONNECTION } from '@/database/database-connection'
import type { Database } from '@/database/database.types'
import { DrizzleReadingSessionsRepository } from './reading-sessions.drizzle-repository'
import type { ReadingSession } from './reading-sessions.types'

type MockQuery = {
  readingSessions: { findMany: jest.Mock }
}

type MockDatabase = {
  query: MockQuery
  select: jest.Mock
  transaction: jest.Mock
}

describe('DrizzleReadingSessionsRepository', () => {
  let repository: DrizzleReadingSessionsRepository
  let db: MockDatabase
  let booksRepository: jest.Mocked<
    Pick<BooksRepository, 'syncProgress' | 'resetProgress'>
  >

  const session: ReadingSession = {
    id: 'session-123',
    bookId: 'book-123',
    fromPage: 1,
    toPage: 5,
    durationSeconds: 300,
    readAt: '2026-09-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrizzleReadingSessionsRepository,
        { provide: DATABASE_CONNECTION, useValue: {} },
        {
          provide: BooksRepository,
          useValue: { syncProgress: jest.fn(), resetProgress: jest.fn() },
        },
      ],
    }).compile()
    repository = module.get(DrizzleReadingSessionsRepository)
    db = {
      query: { readingSessions: { findMany: jest.fn() } },
      select: jest.fn(),
      transaction: jest.fn(),
    }
    ;(repository as unknown as { db: Database }).db = db as unknown as Database
    booksRepository = module.get(BooksRepository)
  })

  it('maps joined rows to sessions when finding all for a user', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ readingSession: session }]),
    })

    await expect(repository.findAll('user-123')).resolves.toEqual([session])
  })

  it('returns the owned session from a joined lookup', async () => {
    db.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([{ readingSession: session }]),
    })

    await expect(
      repository.findOne('session-123', 'user-123'),
    ).resolves.toEqual(session)
  })

  it('creates a session and syncs progress from the latest session', async () => {
    const tx = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([session]),
      }),
      query: {
        readingSessions: { findMany: jest.fn().mockResolvedValue([session]) },
      },
    }
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(tx),
    )

    await expect(
      repository.create(
        { bookId: 'book-123', fromPage: 1, toPage: 5, readAt: '2026-09-01' },
        300,
      ),
    ).resolves.toEqual(session)
    expect(booksRepository.syncProgress).toHaveBeenCalledWith(tx, 'book-123', 5)
  })

  it('updates a session and resynchronizes its book', async () => {
    const tx = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([session]),
      }),
      query: {
        readingSessions: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([{ ...session }])
            .mockResolvedValueOnce([{ ...session, toPage: 8 }]),
        },
      },
    }
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(tx),
    )

    await repository.update('session-123', { toPage: 8 }, 480)

    expect(booksRepository.syncProgress).toHaveBeenCalledWith(tx, 'book-123', 8)
  })

  it('resets the book when deleting its last session with reset enabled', async () => {
    const tx = {
      query: {
        readingSessions: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([session])
            .mockResolvedValueOnce([]),
        },
      },
      delete: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      }),
    }
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(tx),
    )

    await repository.delete('session-123', true)

    expect(booksRepository.resetProgress).toHaveBeenCalledWith(tx, 'book-123')
    expect(booksRepository.syncProgress).not.toHaveBeenCalled()
  })

  it('does nothing when deleting a missing session', async () => {
    const tx = {
      query: { readingSessions: { findMany: jest.fn().mockResolvedValue([]) } },
      delete: jest.fn(),
    }
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(tx),
    )

    await expect(
      repository.delete('missing-session', true),
    ).resolves.toBeUndefined()
    expect(tx.delete).not.toHaveBeenCalled()
  })
})
