import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { CreateBookDto } from './create-book.dto'
import { UpdateBookDto } from './update-book.dto'

const validBook = {
  title: 'Book',
  author: 'Author',
  genre: 'Fiction',
  totalPages: 100,
  status: 'planned',
}

const validateCreate = (overrides: Record<string, unknown> = {}) =>
  validate(plainToInstance(CreateBookDto, { ...validBook, ...overrides }))

const hasErrorOn = (errors: ValidationError[], property: string) =>
  errors.some((error) => error.property === property)

describe('Book notes DTO validation', () => {
  it('accepts notes up to 5000 characters on create and update', async () => {
    const notes = 'x'.repeat(5000)
    const createDto = plainToInstance(CreateBookDto, { ...validBook, notes })
    const updateDto = plainToInstance(UpdateBookDto, { notes })

    await expect(validate(createDto)).resolves.toHaveLength(0)
    await expect(validate(updateDto)).resolves.toHaveLength(0)
  })

  it('rejects notes longer than 5000 characters on create and update', async () => {
    const notes = 'x'.repeat(5001)
    const createDto = plainToInstance(CreateBookDto, { ...validBook, notes })
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
      ...validBook,
      notes: null,
    })
    const updateDto = plainToInstance(UpdateBookDto, { notes: null })

    await expect(validate(createDto)).resolves.toHaveLength(0)
    await expect(validate(updateDto)).resolves.toHaveLength(0)
  })
})

describe('Book text fields validation', () => {
  it.each(['title', 'author', 'genre'])(
    'rejects an empty %s',
    async (field) => {
      const errors = await validateCreate({ [field]: '' })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )

  it.each(['title', 'author', 'genre'])(
    'rejects a whitespace-only %s',
    async (field) => {
      const errors = await validateCreate({ [field]: '   ' })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )

  it.each(['title', 'author', 'genre'])(
    'rejects %s longer than 255 characters',
    async (field) => {
      const errors = await validateCreate({ [field]: 'x'.repeat(256) })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )

  it('trims surrounding whitespace', () => {
    const dto = plainToInstance(CreateBookDto, {
      ...validBook,
      title: '  Dom Casmurro  ',
    })
    expect(dto.title).toBe('Dom Casmurro')
  })
})

describe('Book page fields validation', () => {
  it('accepts currentPage omitted', async () => {
    await expect(validateCreate()).resolves.toHaveLength(0)
  })

  it('accepts currentPage 0', async () => {
    await expect(validateCreate({ currentPage: 0 })).resolves.toHaveLength(0)
  })

  it('rejects an explicit null currentPage', async () => {
    const errors = await validateCreate({ currentPage: null })
    expect(hasErrorOn(errors, 'currentPage')).toBe(true)
  })

  it('rejects a negative currentPage', async () => {
    const errors = await validateCreate({ currentPage: -1 })
    expect(hasErrorOn(errors, 'currentPage')).toBe(true)
  })

  it.each([0, -5, 100001, 1.5])('rejects totalPages %p', async (value) => {
    const errors = await validateCreate({ totalPages: value })
    expect(hasErrorOn(errors, 'totalPages')).toBe(true)
  })
})

describe('Book dates validation', () => {
  it('accepts YYYY-MM-DD dates', async () => {
    await expect(
      validateCreate({ startedAt: '2026-08-31', completedAt: '2026-09-15' }),
    ).resolves.toHaveLength(0)
  })

  it('accepts null dates', async () => {
    await expect(
      validateCreate({ startedAt: null, completedAt: null }),
    ).resolves.toHaveLength(0)
  })

  it.each(['startedAt', 'completedAt'])(
    'rejects a full timestamp in %s',
    async (field) => {
      const errors = await validateCreate({ [field]: '2026-08-31T10:00:00Z' })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )

  it.each(['startedAt', 'completedAt'])(
    'rejects an impossible calendar date in %s',
    async (field) => {
      const errors = await validateCreate({ [field]: '2026-02-31' })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )
})
