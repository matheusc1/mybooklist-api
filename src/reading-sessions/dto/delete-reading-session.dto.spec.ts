import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { DeleteReadingSessionDto } from './delete-reading-session.dto'

describe('DeleteReadingSessionDto', () => {
  const check = (query: Record<string, unknown>) =>
    validate(plainToInstance(DeleteReadingSessionDto, query))

  it('accepts the query without resetToPlanned', async () => {
    await expect(check({})).resolves.toHaveLength(0)
  })

  it.each(['true', 'false'])('accepts resetToPlanned=%s', async (value) => {
    await expect(check({ resetToPlanned: value })).resolves.toHaveLength(0)
  })

  it.each(['typo', '1', 'TRUE', ''])(
    'rejects resetToPlanned=%p',
    async (value) => {
      const errors = await check({ resetToPlanned: value })
      expect(errors.some((e) => e.property === 'resetToPlanned')).toBe(true)
    },
  )

  it('converts the string "true" to a boolean', () => {
    const dto = plainToInstance(DeleteReadingSessionDto, {
      resetToPlanned: 'true',
    })
    expect(dto.resetToPlanned).toBe(true)
  })

  it('converts the string "false" to a boolean', () => {
    const dto = plainToInstance(DeleteReadingSessionDto, {
      resetToPlanned: 'false',
    })
    expect(dto.resetToPlanned).toBe(false)
  })
})
