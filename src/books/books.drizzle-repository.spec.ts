import { NotFoundException } from '@nestjs/common'
import { DrizzleBooksRepository } from './books.drizzle-repository'
import type { Book, NewBook } from './books.types'
import type { Database, Transaction } from '@/database/database.types'
import { books } from '@/database/schema/books.schema'

type MockQuery = {
  books: {
    findFirst: jest.Mock
    findMany: jest.Mock
  }
}

type MockDatabase = {
  query: MockQuery
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  $count: jest.Mock
}

describe('DrizzleBooksRepository', () => {
  let repository: DrizzleBooksRepository
  let db: MockDatabase

  const mockBook: Book = {
    id: 'book-123',
    userId: 'user-123',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    genre: 'Fantasy',
    coverUrl: null,
    totalPages: 300,
    currentPage: 50,
    status: 'reading',
    rating: null,
    startedAt: '2024-01-02',
    completedAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-03T00:00:00.000Z'),
  }

  beforeEach(() => {
    db = {
      query: {
        books: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      $count: jest.fn(),
    }

    repository = new DrizzleBooksRepository(db as unknown as Database)
  })

  it('finds all books belonging to a user', async () => {
    db.query.books.findMany.mockResolvedValue([mockBook])

    await expect(repository.findAll('user-123')).resolves.toEqual([mockBook])
    expect(db.query.books.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    })
  })

  it('finds one book only when its id and owner match', async () => {
    db.query.books.findFirst.mockResolvedValue(mockBook)

    await expect(repository.findOne('book-123', 'user-123')).resolves.toEqual(
      mockBook,
    )
    expect(db.query.books.findFirst).toHaveBeenCalledWith({
      where: { id: 'book-123', userId: 'user-123' },
    })
  })

  it('creates a book and returns the inserted row', async () => {
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      status: 'planned',
    }
    const insertQuery = {
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([mockBook]),
    }
    db.insert.mockReturnValue(insertQuery)

    await expect(repository.create(data)).resolves.toEqual(mockBook)
    expect(insertQuery.values).toHaveBeenCalledWith(data)
    expect(insertQuery.returning).toHaveBeenCalled()
  })

  it('updates a book by id and returns the updated row', async () => {
    const updateData: Partial<NewBook> = { currentPage: 100 }
    const updateQuery = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ ...mockBook, ...updateData }]),
    }
    db.update.mockReturnValue(updateQuery)

    await expect(repository.update('book-123', updateData)).resolves.toEqual({
      ...mockBook,
      ...updateData,
    })
    expect(updateQuery.set).toHaveBeenCalledWith(updateData)
    expect(updateQuery.where).toHaveBeenCalled()
  })

  it('deletes a book by id', async () => {
    const deleteQuery = {
      where: jest.fn().mockResolvedValue(undefined),
    }
    db.delete.mockReturnValue(deleteQuery)

    await expect(repository.delete('book-123')).resolves.toBeUndefined()
    expect(deleteQuery.where).toHaveBeenCalled()
  })

  it('counts completed books within the requested year', async () => {
    db.$count.mockResolvedValue(2)

    await expect(repository.countCompleted('user-123', 2024)).resolves.toBe(2)
    expect(db.$count).toHaveBeenCalledWith(books, expect.anything())
  })

  it('finds the most recently updated reading book', async () => {
    db.query.books.findFirst.mockResolvedValue(mockBook)

    await expect(repository.findCurrentlyReading('user-123')).resolves.toEqual(
      mockBook,
    )
    expect(db.query.books.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'reading' },
      orderBy: { updatedAt: 'desc' },
    })
  })

  it('finds recent activity with an optional excluded book', async () => {
    db.query.books.findMany.mockResolvedValue([mockBook])

    await expect(
      repository.findRecentActivity('user-123', 5, 'book-456'),
    ).resolves.toEqual([mockBook])
    expect(db.query.books.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', id: { ne: 'book-456' } },
      orderBy: { updatedAt: 'desc' },
      limit: 5,
    })
  })

  it('finds the last completed books', async () => {
    db.query.books.findMany.mockResolvedValue([mockBook])

    await expect(repository.findLastCompleted('user-123', 3)).resolves.toEqual([
      mockBook,
    ])
    expect(db.query.books.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'completed' },
      orderBy: { completedAt: 'desc' },
      limit: 3,
    })
  })

  it('syncs progress and marks a book completed at its final page', async () => {
    const tx = {
      query: { books: { findFirst: jest.fn().mockResolvedValue(mockBook) } },
      update: jest.fn(),
    }
    const updatedBook = {
      ...mockBook,
      currentPage: 300,
      status: 'completed' as const,
    }
    const updateQuery = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([updatedBook]),
    }
    tx.update.mockReturnValue(updateQuery)

    await expect(
      repository.syncProgress(tx as unknown as Transaction, 'book-123', 300),
    ).resolves.toEqual(updatedBook)
    expect(updateQuery.set).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPage: 300,
        status: 'completed',
        startedAt: '2024-01-02',
        completedAt: expect.any(String) as string,
      }),
    )
  })

  it('keeps an existing completion date when syncing an already completed book', async () => {
    const completedBook = {
      ...mockBook,
      status: 'completed' as const,
      completedAt: '2024-02-01',
    }
    const tx = {
      query: {
        books: { findFirst: jest.fn().mockResolvedValue(completedBook) },
      },
      update: jest.fn(),
    }
    const updateQuery = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([completedBook]),
    }
    tx.update.mockReturnValue(updateQuery)

    await repository.syncProgress(tx as unknown as Transaction, 'book-123', 300)

    expect(updateQuery.set).toHaveBeenCalledWith({
      currentPage: 300,
      status: 'completed',
      startedAt: '2024-01-02',
      completedAt: '2024-02-01',
    })
  })

  it('throws NotFoundException when syncing a missing book', async () => {
    const tx = {
      query: { books: { findFirst: jest.fn().mockResolvedValue(undefined) } },
      update: jest.fn(),
    }

    await expect(
      repository.syncProgress(tx as unknown as Transaction, 'missing-book', 1),
    ).rejects.toThrow(
      new NotFoundException('Book with id missing-book not found'),
    )
  })

  it('resets progress and returns the updated book', async () => {
    const tx = {
      query: { books: { findFirst: jest.fn().mockResolvedValue(mockBook) } },
      update: jest.fn(),
    }
    const updateQuery = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ ...mockBook, currentPage: 0 }]),
    }
    tx.update.mockReturnValue(updateQuery)

    await repository.resetProgress(tx as unknown as Transaction, 'book-123')

    expect(updateQuery.set).toHaveBeenCalledWith({
      currentPage: 0,
      status: 'planned',
      startedAt: null,
      completedAt: null,
    })
  })

  it('throws NotFoundException when resetting a missing book', async () => {
    const tx = {
      query: { books: { findFirst: jest.fn().mockResolvedValue(undefined) } },
      update: jest.fn(),
    }

    await expect(
      repository.resetProgress(tx as unknown as Transaction, 'missing-book'),
    ).rejects.toThrow(
      new NotFoundException('Book with id missing-book not found'),
    )
  })
})
