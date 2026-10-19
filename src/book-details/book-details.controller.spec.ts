import { Test, TestingModule } from '@nestjs/testing'
import type { User } from '@/users/users.types'
import { BookDetailsController } from './book-details.controller'
import { BookDetailsService } from './book-details.service'

describe('BookDetailsController', () => {
  let controller: BookDetailsController
  let bookDetailsService: jest.Mocked<
    Pick<BookDetailsService, 'getBookDetails'>
  >

  const user = { id: 'user-123' } as User

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookDetailsController],
      providers: [
        {
          provide: BookDetailsService,
          useValue: { getBookDetails: jest.fn() },
        },
      ],
    }).compile()

    controller = module.get(BookDetailsController)
    bookDetailsService = module.get(BookDetailsService)
  })

  it('gets book details for the authenticated user', async () => {
    const details = {
      book: { id: 'book-123' },
      readingSessions: [],
      stats: { sessions: 0, readingTime: 0, activeDays: 0 },
    }
    bookDetailsService.getBookDetails.mockResolvedValue(details as never)

    await expect(controller.getBookDetails('book-123', user)).resolves.toEqual(
      details,
    )
    expect(bookDetailsService.getBookDetails).toHaveBeenCalledWith(
      'book-123',
      user.id,
    )
  })

  it('propagates service errors', async () => {
    bookDetailsService.getBookDetails.mockRejectedValue(
      new Error('book details lookup failed'),
    )

    await expect(controller.getBookDetails('book-123', user)).rejects.toThrow(
      'book details lookup failed',
    )
  })
})
