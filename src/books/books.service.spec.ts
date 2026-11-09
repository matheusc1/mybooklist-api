/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BooksRepository } from './books.repository'
import { BooksService } from './books.service'
import type { Book, NewBook } from './books.types'
import { formatDate } from '@/common/format-date'

describe('BooksService', () => {
  let service: BooksService
  let repository: jest.Mocked<BooksRepository>

  const mockBook: Book = {
    id: 'book-123',
    userId: 'user-123',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    genre: 'Fantasy',
    notes: null,
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: BooksRepository,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            countCompleted: jest.fn(),
            findCurrentlyReading: jest.fn(),
            findCompletedByYear: jest.fn(),
            findRecentActivity: jest.fn(),
            findLastCompleted: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<BooksService>(BooksService)
    repository = module.get(BooksRepository)
  })

  it('finds all books for a user through the repository', async () => {
    repository.findAll.mockResolvedValue([mockBook])

    await expect(service.findAll('user-123')).resolves.toEqual([mockBook])
    expect(repository.findAll).toHaveBeenCalledWith('user-123')
  })

  it('finds a book for its owner through the repository', async () => {
    repository.findOne.mockResolvedValue(mockBook)

    await expect(service.findOne('book-123', 'user-123')).resolves.toEqual(
      mockBook,
    )
    expect(repository.findOne).toHaveBeenCalledWith('book-123', 'user-123')
  })

  it('throws NotFoundException when a book is not found for its owner', async () => {
    repository.findOne.mockResolvedValue(undefined)

    await expect(service.findOne('book-123', 'user-123')).rejects.toThrow(
      new NotFoundException('Book with id book-123 not found'),
    )
  })

  it('creates a book when current page does not exceed total pages', async () => {
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      currentPage: 300,
      status: 'completed',
      startedAt: '2024-01-02',
      completedAt: '2024-02-01',
    }
    repository.create.mockResolvedValue(mockBook)

    await expect(service.create(data)).resolves.toEqual(mockBook)
    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('creates a book with free-form notes', async () => {
    const notes = 'A thoughtful review.'
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      notes,
      totalPages: 300,
      status: 'planned',
    }
    const createdBook = { ...mockBook, notes }
    repository.create.mockResolvedValue(createdBook)

    await expect(service.create(data)).resolves.toEqual(createdBook)
    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('defaults an omitted current page to zero when creating a book', async () => {
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      status: 'planned',
    }
    repository.create.mockResolvedValue(mockBook)

    await expect(service.create(data)).resolves.toEqual(mockBook)
    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('rejects a book whose current page exceeds total pages', async () => {
    const data = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      currentPage: 301,
      status: 'reading' as const,
    }

    await expect(service.create(data)).rejects.toThrow(BadRequestException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('updates an owned book when the resulting progress is valid', async () => {
    const updateData: Partial<Omit<NewBook, 'userId' | 'id'>> = {
      currentPage: 100,
    }
    const updatedBook = { ...mockBook, currentPage: 100 }
    repository.findOne.mockResolvedValue(mockBook)
    repository.update.mockResolvedValue(updatedBook)

    await expect(
      service.update('book-123', 'user-123', updateData),
    ).resolves.toEqual(updatedBook)
    expect(repository.findOne).toHaveBeenCalledWith('book-123', 'user-123')
    expect(repository.update).toHaveBeenCalledWith('book-123', updateData)
  })

  it('updates or clears free-form notes on an owned book', async () => {
    const updateData: Partial<Omit<NewBook, 'userId' | 'id'>> = {
      notes: 'Updated notes.',
    }
    const updatedBook = { ...mockBook, ...updateData }
    repository.findOne.mockResolvedValue(mockBook)
    repository.update.mockResolvedValue(updatedBook)

    await expect(
      service.update('book-123', 'user-123', updateData),
    ).resolves.toEqual(updatedBook)
    expect(repository.update).toHaveBeenCalledWith('book-123', updateData)

    repository.update.mockResolvedValue({ ...mockBook, notes: null })
    await expect(
      service.update('book-123', 'user-123', { notes: null }),
    ).resolves.toEqual({ ...mockBook, notes: null })
    expect(repository.update).toHaveBeenLastCalledWith('book-123', {
      notes: null,
    })
  })

  it('rejects an update when the new total pages makes progress invalid', async () => {
    repository.findOne.mockResolvedValue(mockBook)

    await expect(
      service.update('book-123', 'user-123', { totalPages: 40 }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('does not update a book that the user does not own', async () => {
    repository.findOne.mockResolvedValue(undefined)

    await expect(
      service.update('book-123', 'other-user', { title: 'Updated' }),
    ).rejects.toThrow(NotFoundException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it.each([
    'title',
    'author',
    'genre',
    'totalPages',
    'currentPage',
    'status',
  ] as const)(
    'rejects null %s on update before reaching the repository',
    async (field) => {
      await expect(
        service.update('book-123', 'user-123', {
          [field]: null,
        }),
      ).rejects.toThrow(BadRequestException)
      expect(repository.findOne).not.toHaveBeenCalled()
      expect(repository.update).not.toHaveBeenCalled()
    },
  )

  it('allows null on nullable fields in update', async () => {
    const updateData: Partial<Omit<NewBook, 'userId' | 'id'>> = {
      coverUrl: null,
      rating: null,
      startedAt: null,
      completedAt: null,
    }
    repository.findOne.mockResolvedValue(mockBook)
    repository.update.mockResolvedValue(mockBook)

    await expect(
      service.update('book-123', 'user-123', updateData),
    ).resolves.toEqual(mockBook)
    expect(repository.update).toHaveBeenCalledWith('book-123', updateData)
  })

  it('rejects creating a book completed before it was started', async () => {
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      status: 'completed',
      startedAt: '2024-02-01',
      completedAt: '2024-01-15',
    }

    await expect(service.create(data)).rejects.toThrow(BadRequestException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('accepts a book started and completed on the same day', async () => {
    const data: NewBook = {
      userId: 'user-123',
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      status: 'completed',
      startedAt: '2024-02-01',
      completedAt: '2024-02-01',
    }
    repository.create.mockResolvedValue(mockBook)

    await expect(service.create(data)).resolves.toEqual(mockBook)
    expect(repository.create).toHaveBeenCalledWith(data)
  })

  it('checks a new completion date against the stored start date on update', async () => {
    repository.findOne.mockResolvedValue(mockBook) // startedAt: 2024-01-02

    await expect(
      service.update('book-123', 'user-123', { completedAt: '2024-01-01' }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('accepts a completion date after the stored start date on update', async () => {
    const updateData: Partial<Omit<NewBook, 'userId' | 'id'>> = {
      completedAt: '2024-02-01',
    }
    repository.findOne.mockResolvedValue(mockBook)
    repository.update.mockResolvedValue({ ...mockBook, ...updateData })

    await expect(
      service.update('book-123', 'user-123', updateData),
    ).resolves.toEqual({ ...mockBook, ...updateData })
  })

  it('allows clearing the start date even when a completion date is stored', async () => {
    const completed = { ...mockBook, completedAt: '2024-02-01' }
    repository.findOne.mockResolvedValue(completed)
    repository.update.mockResolvedValue({ ...completed, startedAt: null })

    await expect(
      service.update('book-123', 'user-123', { startedAt: null }),
    ).resolves.toEqual({ ...completed, startedAt: null })
  })

  it('deletes an owned book after verifying ownership', async () => {
    repository.findOne.mockResolvedValue(mockBook)
    repository.delete.mockResolvedValue()

    await expect(
      service.delete('book-123', 'user-123'),
    ).resolves.toBeUndefined()
    expect(repository.findOne).toHaveBeenCalledWith('book-123', 'user-123')
    expect(repository.delete).toHaveBeenCalledWith('book-123')
  })

  it('does not delete a missing or unauthorized book', async () => {
    repository.findOne.mockResolvedValue(undefined)

    await expect(service.delete('book-123', 'other-user')).rejects.toThrow(
      NotFoundException,
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('delegates completed-book counts and reading lists to the repository', async () => {
    repository.countCompleted.mockResolvedValue(2)
    repository.findCurrentlyReading.mockResolvedValue(mockBook)
    repository.findRecentActivity.mockResolvedValue([mockBook])
    repository.findLastCompleted.mockResolvedValue([mockBook])

    await expect(service.countCompleted('user-123', 2024)).resolves.toBe(2)
    await expect(service.findCurrentlyReading('user-123')).resolves.toEqual(
      mockBook,
    )
    await expect(
      service.findRecentActivity('user-123', 5, 'book-456'),
    ).resolves.toEqual([mockBook])
    await expect(service.findLastCompleted('user-123', 3)).resolves.toEqual([
      mockBook,
    ])

    expect(repository.countCompleted).toHaveBeenCalledWith('user-123', 2024)
    expect(repository.findCurrentlyReading).toHaveBeenCalledWith('user-123')
    expect(repository.findRecentActivity).toHaveBeenCalledWith(
      'user-123',
      5,
      'book-456',
    )
    expect(repository.findLastCompleted).toHaveBeenCalledWith('user-123', 3)
  })

  it('delegates the completed books of a year to the repository', async () => {
    repository.findCompletedByYear.mockResolvedValue([mockBook])

    await expect(
      service.findCompletedByYear('user-123', 2025),
    ).resolves.toEqual([mockBook])
    expect(repository.findCompletedByYear).toHaveBeenCalledWith(
      'user-123',
      2025,
    )
  })

  it('propagates repository errors', async () => {
    repository.findAll.mockRejectedValue(new Error('lookup failed'))

    await expect(service.findAll('user-123')).rejects.toThrow('lookup failed')
  })

  describe('completion date default', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date(2024, 5, 15, 12))
    })
    afterEach(() => jest.useRealTimers())

    it('fills completedAt with today when creating a completed book without one', async () => {
      const data: NewBook = {
        userId: 'user-123',
        title: 'The Hobbit',
        author: 'J. R. R. Tolkien',
        genre: 'Fantasy',
        totalPages: 300,
        currentPage: 300,
        status: 'completed',
      }
      repository.create.mockResolvedValue(mockBook)

      await service.create(data)
      expect(repository.create).toHaveBeenCalledWith({
        ...data,
        completedAt: formatDate(new Date()),
      })
    })

    it('keeps the given completedAt when creating a completed book', async () => {
      const data: NewBook = {
        userId: 'user-123',
        title: 'The Hobbit',
        author: 'J. R. R. Tolkien',
        genre: 'Fantasy',
        totalPages: 300,
        status: 'completed',
        completedAt: '2024-02-01',
      }
      repository.create.mockResolvedValue(mockBook)

      await service.create(data)
      expect(repository.create).toHaveBeenCalledWith(data)
    })

    it('fills completedAt when an update turns a book into completed', async () => {
      repository.findOne.mockResolvedValue(mockBook) // completedAt: null
      repository.update.mockResolvedValue(mockBook)

      await service.update('book-123', 'user-123', { status: 'completed' })
      expect(repository.update).toHaveBeenCalledWith('book-123', {
        status: 'completed',
        completedAt: formatDate(new Date()),
      })
    })

    it('does not touch completedAt of an already completed book', async () => {
      repository.findOne.mockResolvedValue({
        ...mockBook,
        status: 'completed',
        completedAt: '2024-02-01',
      })
      repository.update.mockResolvedValue(mockBook)

      await service.update('book-123', 'user-123', { notes: 'Great.' })
      expect(repository.update).toHaveBeenCalledWith('book-123', {
        notes: 'Great.',
      })
    })
  })
})
