import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { GetActivityDto } from './get-activity.dto'

describe('GetActivityDto', () => {
  const check = (query: Record<string, unknown>) =>
    validate(plainToInstance(GetActivityDto, query))

  it.each(['2026-01', '2026-09', '2026-12'])(
    'accepts month=%s',
    async (month) => {
      await expect(check({ month })).resolves.toHaveLength(0)
    },
  )

  it.each([
    '2026-00',
    '2026-13',
    '2026-99',
    '2026-2',
    '2026-9',
    '2026-09-01',
    'abc',
    '',
  ])('rejects month=%p', async (month) => {
    const errors = await check({ month })
    expect(errors.some((e) => e.property === 'month')).toBe(true)
  })

  it('rejects a missing month', async () => {
    const errors = await check({})
    expect(errors.some((e) => e.property === 'month')).toBe(true)
  })
})
