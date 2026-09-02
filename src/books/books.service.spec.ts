/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BooksRepository } from './books.repository'
import { BooksService } from './books.service'
import type { Book, NewBook } from './books.types'

describe('BooksService', () => {
  let service: BooksService
  let repository: jest.Mocked<BooksRepository>

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
    }
    repository.create.mockResolvedValue(mockBook)

    await expect(service.create(data)).resolves.toEqual(mockBook)
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
    const updateData: Partial<NewBook> = { currentPage: 100 }
    const updatedBook = { ...mockBook, currentPage: 100 }
    repository.findOne.mockResolvedValue(mockBook)
    repository.update.mockResolvedValue(updatedBook)

    await expect(
      service.update('book-123', 'user-123', updateData),
    ).resolves.toEqual(updatedBook)
    expect(repository.findOne).toHaveBeenCalledWith('book-123', 'user-123')
    expect(repository.update).toHaveBeenCalledWith('book-123', updateData)
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

  it('propagates repository errors', async () => {
    repository.findAll.mockRejectedValue(new Error('lookup failed'))

    await expect(service.findAll('user-123')).rejects.toThrow('lookup failed')
  })
})
