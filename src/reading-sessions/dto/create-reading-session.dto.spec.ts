import { plainToInstance } from 'class-transformer'
import { validate, ValidationError } from 'class-validator'
import { CreateReadingSessionDto } from './create-reading-session.dto'

const validSession = {
  bookId: '5e0c8e6f-25e4-4d28-9d88-055994111aa3',
  fromPage: 10,
  toPage: 19,
}

const check = (overrides: Record<string, unknown> = {}) =>
  validate(
    plainToInstance(CreateReadingSessionDto, { ...validSession, ...overrides }),
  )

const hasErrorOn = (errors: ValidationError[], property: string) =>
  errors.some((error) => error.property === property)

describe('CreateReadingSessionDto', () => {
  it('accepts a session without readAt', async () => {
    await expect(check()).resolves.toHaveLength(0)
  })

  it('accepts a YYYY-MM-DD readAt', async () => {
    await expect(check({ readAt: '2026-08-30' })).resolves.toHaveLength(0)
  })

  it('rejects an explicit null readAt', async () => {
    const errors = await check({ readAt: null })
    expect(hasErrorOn(errors, 'readAt')).toBe(true)
  })

  it('rejects a full timestamp in readAt', async () => {
    const errors = await check({ readAt: '2026-08-30T10:00:00Z' })
    expect(hasErrorOn(errors, 'readAt')).toBe(true)
  })

  it('rejects an impossible calendar date in readAt', async () => {
    const errors = await check({ readAt: '2026-02-31' })
    expect(hasErrorOn(errors, 'readAt')).toBe(true)
  })

  it('rejects a bookId that is not a UUID', async () => {
    const errors = await check({ bookId: 'book-123' })
    expect(hasErrorOn(errors, 'bookId')).toBe(true)
  })

  it.each(['fromPage', 'toPage'])('rejects a negative %s', async (field) => {
    const errors = await check({ [field]: -1 })
    expect(hasErrorOn(errors, field)).toBe(true)
  })

  it.each(['fromPage', 'toPage'])(
    'rejects a non-integer %s',
    async (field) => {
      const errors = await check({ [field]: 1.5 })
      expect(hasErrorOn(errors, field)).toBe(true)
    },
  )
})
