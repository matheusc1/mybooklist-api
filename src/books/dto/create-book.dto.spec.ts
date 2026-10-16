import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateBookDto } from './create-book.dto'
import { UpdateBookDto } from './update-book.dto'

describe('Book notes DTO validation', () => {
  it('accepts notes up to 5000 characters on create and update', async () => {
    const notes = 'x'.repeat(5000)
    const createDto = plainToInstance(CreateBookDto, {
      title: 'Book',
      author: 'Author',
      genre: 'Fiction',
      totalPages: 100,
      status: 'planned',
      notes,
    })
    const updateDto = plainToInstance(UpdateBookDto, { notes })

    await expect(validate(createDto)).resolves.toHaveLength(0)
    await expect(validate(updateDto)).resolves.toHaveLength(0)
  })

  it('rejects notes longer than 5000 characters on create and update', async () => {
    const notes = 'x'.repeat(5001)
    const createDto = plainToInstance(CreateBookDto, {
      title: 'Book',
      author: 'Author',
      genre: 'Fiction',
      totalPages: 100,
      status: 'planned',
      notes,
    })
    const updateDto = plainToInstance(UpdateBookDto, { notes })

    const createErrors = await validate(createDto)
    const updateErrors = await validate(updateDto)

    expect(
      createErrors.some(
        (error) => error.property === 'notes' && error.constraints?.maxLength,
      ),
    ).toBe(true)
    expect(
      updateErrors.some(
        (error) => error.property === 'notes' && error.constraints?.maxLength,
      ),
    ).toBe(true)
  })

  it('allows notes to be omitted or cleared with null', async () => {
    const createDto = plainToInstance(CreateBookDto, {
      title: 'Book',
      author: 'Author',
      genre: 'Fiction',
      totalPages: 100,
      status: 'planned',
      notes: null,
    })
    const updateDto = plainToInstance(UpdateBookDto, { notes: null })

    await expect(validate(createDto)).resolves.toHaveLength(0)
    await expect(validate(updateDto)).resolves.toHaveLength(0)
  })
})
