import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { CreateBookDto } from '@/books/dto/create-book.dto'
import { UpdateBookDto } from '@/books/dto/update-book.dto'
import { DeleteReadingSessionDto } from '@/reading-sessions/dto/delete-reading-session.dto'
import { validationPipeOptions } from './configure-app'

describe('validationPipeOptions', () => {
  const pipe = new ValidationPipe(validationPipeOptions)

  const validBook = {
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    genre: 'Fantasy',
    totalPages: 300,
    status: 'planned',
  }

  it('accepts a valid body', async () => {
    await expect(
      pipe.transform(validBook, { type: 'body', metatype: CreateBookDto }),
    ).resolves.toBeDefined()
  })

  it('rejects a property that is not part of the create DTO', async () => {
    await expect(
      pipe.transform(
        { ...validBook, userId: 'other-user' },
        { type: 'body', metatype: CreateBookDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects a property that is not part of the update DTO', async () => {
    await expect(
      pipe.transform(
        { userId: 'other-user' },
        { type: 'body', metatype: UpdateBookDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('rejects an explicit null currentPage', async () => {
    await expect(
      pipe.transform(
        { ...validBook, currentPage: null },
        { type: 'body', metatype: CreateBookDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })

  it('transforms the resetToPlanned query string to a boolean', async () => {
    const query = (await pipe.transform(
      { resetToPlanned: 'true' },
      { type: 'query', metatype: DeleteReadingSessionDto },
    )) as DeleteReadingSessionDto

    expect(query.resetToPlanned).toBe(true)
  })

  it('rejects an invalid resetToPlanned query string', async () => {
    await expect(
      pipe.transform(
        { resetToPlanned: 'typo' },
        { type: 'query', metatype: DeleteReadingSessionDto },
      ),
    ).rejects.toThrow(BadRequestException)
  })
})
