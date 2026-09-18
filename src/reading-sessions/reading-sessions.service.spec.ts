/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { BooksService } from '@/books/books.service'
import type { User } from '@/users/users.types'
import { ReadingSessionsRepository } from './reading-sessions.repository'
import { ReadingSessionsService } from './reading-sessions.service'
import type { ReadingSession } from './reading-sessions.types'

describe('ReadingSessionsService', () => {
  let service: ReadingSessionsService
  let repository: jest.Mocked<ReadingSessionsRepository>
  let booksService: jest.Mocked<Pick<BooksService, 'findOne'>>

  const user = { id: 'user-123', readingSpeed: 60 } as User
  const session: ReadingSession = {
    id: 'session-123',
    bookId: 'book-123',
    fromPage: 10,
    toPage: 19,
    durationSeconds: 600,
    readAt: '2026-09-01',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
  }
  const book = { totalPages: 20 } as never

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingSessionsService,
        {
          provide: ReadingSessionsRepository,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: BooksService, useValue: { findOne: jest.fn() } },
      ],
    }).compile()

    service = module.get(ReadingSessionsService)
    repository = module.get(ReadingSessionsRepository)
    booksService = module.get(BooksService)
  })

  it('finds all sessions for a user', async () => {
    repository.findAll.mockResolvedValue([session])

    await expect(service.findAll('user-123')).resolves.toEqual([session])
    expect(repository.findAll).toHaveBeenCalledWith('user-123')
  })

  it('throws when a session is not found for its owner', async () => {
    repository.findOne.mockResolvedValue(undefined)

    await expect(service.findOne('session-123', 'user-123')).rejects.toThrow(
      new NotFoundException('Reading Session with id session-123 not found'),
    )
  })

  it('verifies book ownership and calculates duration when creating', async () => {
    booksService.findOne.mockResolvedValue(book)
    repository.create.mockResolvedValue(session)
    const data = { bookId: 'book-123', fromPage: 10, toPage: 19 }

    await expect(service.create(user, data)).resolves.toEqual(session)
    expect(booksService.findOne).toHaveBeenCalledWith('book-123', 'user-123')
    expect(repository.create).toHaveBeenCalledWith(data, 600)
  })

  it('uses zero duration when the user has no reading speed', async () => {
    booksService.findOne.mockResolvedValue(book)
    repository.create.mockResolvedValue(session)

    await service.create(
      { ...user, readingSpeed: null },
      { bookId: 'book-123', fromPage: 10, toPage: 19 },
    )

    expect(repository.create).toHaveBeenCalledWith(
      { bookId: 'book-123', fromPage: 10, toPage: 19 },
      0,
    )
  })

  it('rejects a reversed page range without creating a session', async () => {
    booksService.findOne.mockResolvedValue(book)

    await expect(
      service.create(user, { bookId: 'book-123', fromPage: 20, toPage: 19 }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects a toPage greater than the book totalPages when creating', async () => {
    booksService.findOne.mockResolvedValue(book)

    await expect(
      service.create(user, { bookId: 'book-123', fromPage: 10, toPage: 21 }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('accepts a toPage equal to the book totalPages when creating', async () => {
    booksService.findOne.mockResolvedValue(book)
    repository.create.mockResolvedValue(session)

    await expect(
      service.create(user, { bookId: 'book-123', fromPage: 10, toPage: 20 }),
    ).resolves.toEqual(session)
    expect(repository.create).toHaveBeenCalled()
  })

  it('accepts a toPage one below the book totalPages when creating', async () => {
    booksService.findOne.mockResolvedValue(book)
    repository.create.mockResolvedValue(session)

    await expect(
      service.create(user, { bookId: 'book-123', fromPage: 10, toPage: 19 }),
    ).resolves.toEqual(session)
    expect(repository.create).toHaveBeenCalled()
  })

  it('uses existing pages for omitted fields when updating', async () => {
    repository.findOne.mockResolvedValue(session)
    booksService.findOne.mockResolvedValue(book)
    repository.update.mockResolvedValue(session)

    await service.update('session-123', user, { toPage: 20 })

    expect(booksService.findOne).toHaveBeenCalledWith(session.bookId, user.id)
    expect(repository.update).toHaveBeenCalledWith(
      'session-123',
      { toPage: 20 },
      660,
    )
  })

  it('does not update a session that the user cannot access', async () => {
    repository.findOne.mockResolvedValue(undefined)

    await expect(
      service.update('session-123', user, { toPage: 20 }),
    ).rejects.toThrow(NotFoundException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects a reversed page range without updating a session', async () => {
    repository.findOne.mockResolvedValue(session)
    booksService.findOne.mockResolvedValue(book)

    await expect(
      service.update('session-123', user, { fromPage: 15, toPage: 10 }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('rejects a toPage greater than the book totalPages when updating', async () => {
    repository.findOne.mockResolvedValue(session)
    booksService.findOne.mockResolvedValue(book)

    await expect(
      service.update('session-123', user, { toPage: 21 }),
    ).rejects.toThrow(BadRequestException)
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('accepts a toPage equal to the book totalPages when updating', async () => {
    repository.findOne.mockResolvedValue(session)
    booksService.findOne.mockResolvedValue(book)
    repository.update.mockResolvedValue(session)

    await expect(
      service.update('session-123', user, { toPage: 20 }),
    ).resolves.toEqual(session)
    expect(repository.update).toHaveBeenCalled()
  })

  it('accepts a toPage one below the book totalPages when updating', async () => {
    repository.findOne.mockResolvedValue(session)
    booksService.findOne.mockResolvedValue(book)
    repository.update.mockResolvedValue(session)

    await expect(
      service.update('session-123', user, { toPage: 19 }),
    ).resolves.toEqual(session)
    expect(repository.update).toHaveBeenCalled()
  })

  it('deletes an owned session with the requested reset option', async () => {
    repository.findOne.mockResolvedValue(session)
    repository.delete.mockResolvedValue()

    await expect(
      service.delete('session-123', 'user-123', true),
    ).resolves.toBeUndefined()
    expect(repository.findOne).toHaveBeenCalledWith('session-123', 'user-123')
    expect(repository.delete).toHaveBeenCalledWith('session-123', true)
  })

  it('propagates dependency errors', async () => {
    repository.findAll.mockRejectedValue(new Error('lookup failed'))

    await expect(service.findAll('user-123')).rejects.toThrow('lookup failed')
  })
})
