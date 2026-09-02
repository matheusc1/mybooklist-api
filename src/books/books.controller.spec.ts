import { Test, TestingModule } from '@nestjs/testing'
import { BooksController } from './books.controller'
import { BooksService } from './books.service'
import type { User } from '@/users/users.types'
import type { Book } from './books.types'

describe('BooksController', () => {
  let controller: BooksController
  let booksService: jest.Mocked<
    Pick<BooksService, 'findAll' | 'findOne' | 'create' | 'update' | 'delete'>
  >

  const authenticatedUser: User = {
    id: 'user-123',
    provider: 'google',
    providerId: 'google-123',
    email: 'user@example.com',
    name: 'Test User',
    avatarUrl: null,
    readingSpeed: 90,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  const book: Book = {
    id: 'book-123',
    userId: 'user-123',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    genre: 'Fantasy',
    coverUrl: null,
    totalPages: 300,
    currentPage: 0,
    status: 'planned',
    rating: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<BooksController>(BooksController)
    booksService = module.get(BooksService)
  })

  it('lists the authenticated user books', async () => {
    booksService.findAll.mockResolvedValue([book])

    await expect(controller.findAll(authenticatedUser)).resolves.toEqual([book])
    expect(booksService.findAll).toHaveBeenCalledWith('user-123')
  })

  it('gets a book by id for the authenticated user', async () => {
    booksService.findOne.mockResolvedValue(book)

    await expect(
      controller.findOne('book-123', authenticatedUser),
    ).resolves.toEqual(book)
    expect(booksService.findOne).toHaveBeenCalledWith('book-123', 'user-123')
  })

  it('adds the authenticated user id when creating a book', async () => {
    const dto = {
      title: 'The Hobbit',
      author: 'J. R. R. Tolkien',
      genre: 'Fantasy',
      totalPages: 300,
      status: 'planned' as const,
    }
    booksService.create.mockResolvedValue(book)

    await expect(controller.create(dto, authenticatedUser)).resolves.toEqual(
      book,
    )
    expect(booksService.create).toHaveBeenCalledWith({
      ...dto,
      userId: 'user-123',
    })
  })

  it('updates a book for the authenticated user', async () => {
    const dto = { currentPage: 100 }
    booksService.update.mockResolvedValue({ ...book, currentPage: 100 })

    await expect(
      controller.update('book-123', dto, authenticatedUser),
    ).resolves.toEqual({ ...book, currentPage: 100 })
    expect(booksService.update).toHaveBeenCalledWith(
      'book-123',
      'user-123',
      dto,
    )
  })

  it('deletes a book for the authenticated user', async () => {
    booksService.delete.mockResolvedValue()

    await expect(
      controller.delete('book-123', authenticatedUser),
    ).resolves.toBeUndefined()
    expect(booksService.delete).toHaveBeenCalledWith('book-123', 'user-123')
  })

  it('propagates service errors', async () => {
    booksService.findOne.mockRejectedValue(new Error('book lookup failed'))

    await expect(
      controller.findOne('missing-book', authenticatedUser),
    ).rejects.toThrow('book lookup failed')
  })
})
